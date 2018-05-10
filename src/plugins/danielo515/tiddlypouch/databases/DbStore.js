/*\
title: $:/plugins/danielo515/tiddlypouch/DbStore.js
type: application/javascript
module-type: library

Manages insertions, extractions, deletions of tiddlers to a database.

@preserve

\*/

'use strict';
/*global PouchDB */
/*jslint node: true, browser: true */
/*global $tw, module */

const identity = (x) => x;

/***====================== EXPORTS  ========================== */

module.exports = DbStore;

/**
 * @classdesc Handles the operations related to fetching and saving tiddlers to a database.
 * it is the PouchDB equivalent to the wiki store.
 *
 * It expects some methods to be injected: _convertFromCouch, _convertToCouch, _mangleTitle
 * such injection is responsibility of the factory that instantiates this objects.
 *
 * @see DbStore.factory
 *
 * If the database does not exist it will be created
 * @class
 * @param {String} dbName The name should match the PouchDB name
 * @param {PouchDB} [db] An already existing PouchDB database object to wrap .
 */
function DbStore(dbName/**String */, db /**PouchDB db Optional */) {
    this.name = dbName;
    this._db = db instanceof PouchDB ? db : new PouchDB(dbName);
    this.logger = new $TPouch.Logger("DbStore:" + dbName);
}


/***====================== PURE DB METHODS ========================== */

/**
 * Creates generic conflict-handler functions.
 * The returned function logs a default message to the console in case of conflict,
 * otherwise it throws the error so the next catch on the promise chain can handle it
 *
 * @param {any} message the message the returned handler will log to the console in case of conflict
 * @returns {function} handler a function ready to be used inside a catch statement in a promise chain
 * @static
 */
DbStore.prototype._Conflict = function conflict(message) {
    var self = this;
    return function (err) {
        if (err.status == 409) {
            return self.logger.log(message);
        }
        throw err;
    }
};

/**
 * Deletes the current database
 * @returns {Promise} A promise that fulfills when the database is destroyed
 */
DbStore.prototype.destroy = function destroy() {
    return this._db.destroy();
};

/**
 * @function makeDesignDocument
 * @param  {String}   name        {description}
 * @param  {Function} mapFunction {description}
 * @param  {Function} processView An optional function to pre-process the code of the map function. For example injecting more code. Should return an string
 * @return {type} {description}
 */
DbStore.prototype._makeDesignDocument = function makeDesignDocument(name, mapFunction, processView = identity) {
    return {
        _id: '_design/' + name,
        views: {
            [name]: {
                map: processView(mapFunction.toString())
            }
        }
    };
}

// Source: https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
/**
 * Creates an index with the given name. In CouchDB this means a design document
 * with a map function that emits the key to be indexed
 * @example createIndex('by_type' , function(doc){ emit(doc.fields.type) })
 * @public
 * @param  {String} name The name of the index, ej: by_type
 * @param  {Function} mapFunction A couch map function that will be used to build the index
 * @param  {Function} processView An optional function to pre-process the code of the map function. For example injecting more code
 * @return {promise} A promise that fulfills when the design document is inserted
 */
DbStore.prototype.createIndex = function createIndex(name, mapFunction, processView) {

    this.logger.debug('Creating index' + name + '...')
    return this._db
        .put(this._makeDesignDocument(name, mapFunction, processView))
        .then(() => this.logger.debug('Index ' + name + ' created'))
        .catch(this._Conflict('Index ' + name + ' exists already'));
}

/**
 * @function replaceIndex
 * Replaces an existing index with the provided mapFunction.
 * If the index does not exists it will be created.
 * We accept a meta-programming function that will have the opportunity to inject code into the map function.
 * Note that it is easier to fetch the document, handle the 404 and then insert the document than try to insert, handle the 409 and then try to insert again.
 * @param  {String}   name        The name of the index, ej: by_type
 * @param  {Function} mapFunction A couch map function that will be used to build the index
 * @param  {Function} processView An optional function to pre-process the code of the map function. For example injecting more code. Should return an string
 * @return {Promise} {description}
 */
DbStore.prototype.replaceIndex = function replaceIndex(name, mapFunction, processView) {
    const index = this._makeDesignDocument(name, mapFunction, processView);
    return this._db
        .get(index._id)
        .catch((err) => {
            // like upsert, if it does not exist create it. Any other error will not be handled
            if (err.status !== 404) { 
                throw err;
            }
            return {}; // default object for the next promise
        })
        .then(({ _rev }) => {
            _rev && (index._rev = _rev);
            return this._db.put(index)
        });
};

/**
 * Updates a document on the database if it exists.
 * Creates a new document if it does not exist.
 * If the document has a revision but it is new it will throw a conflict
 * so we look for it and if we get a 404 (not found) we remove the revision
 * and try to create it again.
 *
 * @param {any} document  - It should be a document ready to be inserted,
 *                          no conversion from TW format will be performed.
 * @returns {promise} A promise that fulfills when the document is upserted
 */
DbStore.prototype._upsert = function (document) {
    var self = this;
    return self._db.put(document)
        .then(function (saveInfo) {
            return saveInfo
        })
        .catch(function (err) {
            if (err) {
                if (err.name === 'conflict') { // check if it is a real conflict
                    self.logger.debug('O my gosh, update conflict!')
                    return self._db.get(document._id)
                        .then(function (document) { //oops, we got a document, this was an actual conflict
                            self.logger.log("A real update conflict!", document);
                            throw err; // propagate the error for the moment
                        })
                        .catch(function (err) {
                            if (err.name === 'not_found') { // not found means no actual conflict
                                self.logger.debug("Fake conflict, trying again", document);
                                document._rev = null;
                                return self._db.put(document);
                            }
                        });

                }
                throw err //propagate the error if it is not a conflict
            }

        });

};


/**
 * Validates the passed revision according to PouchDB revision format.
 * If the revision passes the validation then it is returned.
 * If it does not, null is returned
 *
 * @param {string} rev - the revision to validate
 * @static
 * @private
 * @returns {String|null} The revision if it has the correct format, null otherwhise
 */
DbStore.prototype._validateRevision = function validateRevision(rev) {
    if (/\d+-[A-z0-9]*/.test(rev)) {
        return rev
    }
    return null
};

/***============================ TIDDLER STORE METHODS ======== */

/**
 * Adds a tiddler to the database.
 * It handles all the required conversions for making it compatible with CouchDB or PouchDB
 *
 * @param {object} tiddler A tiddler fields object. Not a regular tiddler.
 * @param {object} options Metadata about this tiddler. Usually provided by the syncer
 * @return {promise} fulfills when the tiddler is saved failed to save.
 */
DbStore.prototype.addTiddler = function (tiddler, options) {
    var self = this;
    var convertedTiddler = this._convertToCouch(tiddler, options.tiddlerInfo);
    this.logger.debug("Saving ", convertedTiddler);
    return self._upsert(convertedTiddler);
};

DbStore.prototype.deleteTiddler = function (title) {
    var self = this;
    var docID = self._mangleTitle(title);
    return self._db.get(docID)
        .then(function (doc) {
            doc._deleted = true;
            return self._db.put(doc);
        })
        .catch(self.logger.log.bind(self.logger, 'Something went wrong deleting ' + title))
}

DbStore.prototype.getTiddler = function (title, revision) {
    var self = this;
    var query = [self._mangleTitle(title)]
    /** Because PouchDB uses the arguments object we can not pass an undefined value as
     * second parameter, they try to use it. So to be able to make the query in just one call
     * we create an array that dinamycally adds the extra options only if they are required.
     * This way, we can call the get function without passing any undefined value
     */
    if (self._validateRevision(revision)) {
        query.push({ rev: revision });
    }
    self.logger.debug('Retrieving tiddler ', title, ' from database');
    return self._db.get.apply(self._db, query)
        .then(self._convertFromCouch.bind(self))
        .catch(function (err) {
            self.logger.log('Error getting tiddler ' + title + ' from DB', err);
            throw err;
        });
};

/**
 * Queries an existing index (not controlled) for tiddlers.
 *
 * @param {String} index          - an existing database index that you want to use for the search
 * @param {String} [search_term]  -  it will be used as key search (the first value emited on the map function)
 * @param {Boolean} [includeDocs] - Defaults to true. If the documents of the search result should be included or not.
 *                                  There are some scenarios where you don't want the document to be included,
 *                                  querying for skinny tiddlers for example
 * @return {promise} fulfills to an array of already converted tiddlers
 */
DbStore.prototype.getTiddlers = function (index, search_term, includeDocs) {
    var self = this;
    var queryOptions = { include_docs: (undefined === includeDocs) ? true : includeDocs };

    if (search_term) {
        queryOptions.key = search_term;
    }

    return self._db.query(index, queryOptions)
        .then(function (result) {
            self.logger.trace("Query to ", index, " searching for ", search_term, " : ", result.rows);
            return result.rows
        })
        .then(function (rows) {
            /** query Api returns documents in a different format, we have to convert them to the format convertFromCouch expects */
            return rows.map(function (doc) {
                return doc.doc ? doc.doc : { // if doc is included just return it or try to make a conversion otherwhise
                    // the key is missed! maybe provide a conversion function as parameter?
                    _id: doc.id,
                    fields: doc.value
                }
            })
        }).then(function (documents) {
            return documents.map(self._convertFromCouch.bind(self));
        })
        .catch(self.logger.log.bind(self.logger));
};

/**
 * returns the revisions of a given tiddler.
 * Only available revisions are returned
 * @param {string} title The tiddler's title you want the revisions
 * @return {promise} promise that fulfills to an array of revisions
 */
DbStore.prototype.getTiddlerRevisions = function (title) {
    return this._db.get(this._mangleTitle(title), { revs_info: true })
        .then(function (document) {
            var revisions = document._revs_info.filter(onlyAvailable).map(getRevisionId);
            return revisions;
        });

    function onlyAvailable(rev) { return rev.status === "available"; }
    function getRevisionId(rev) { return rev.rev; }
}