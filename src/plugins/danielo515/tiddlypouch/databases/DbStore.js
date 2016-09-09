/*\
title: $:/plugins/danielo515/tiddlypouch/DbStore.js
type: application/javascript
module-type: library

Manages insertions, extractions, deletions of tiddlers to a database.

@preserve

\*/

'use strict';
/* global PouchDB */
/*jslint node: true, browser: true */
/* global $tw */


/**
 * @classdesc Handles the operations related to fetching and saving tiddlers to a database.
 * it is the PouchDB equivalent to the wiki store.
 * 
 * If the database does not exist it will be created
 * @class
 * @param {String} dbName The name should match the PouchDB name
 * @param {PouchDB} [db] An already existing PouchDB database object to wrap .
 */
function DbStore(dbName/**String */,db /**PouchDB db Optional */) {
    this.name = dbName;
    this._db = db instanceof PouchDB ? db : new PouchDB(dbName);
}


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
* CouchDB does not like document IDs starting with '_'.
* Convert leading '_' to '%5f' and leading '%' to '%25'
* Only used to compute _id / URL for a tiddler. Does not affect 'title' field.
* @param {String} title The title of the tiddler to mangle
* @return {String} The same title ready to be inserted into PouchDB/couchdb
*/
DbStore.prototype._mangleTitle = function mangleTitle(title) {
    if (title.length == 0) {
        return title;
    }
    var firstChar = title.charAt(0);
    var restOfIt = title.substring(1);
    if (firstChar === '_') {
        return '%5f' + restOfIt;
    }
    else if (firstChar === '%') {
        return '%25' + restOfIt;
    }
    else {
        return title;
    }
}

/**
 * Copy all fields to "fields" sub-object except for the "revision" field.
 * See also: TiddlyWebAdaptor.prototype.convertTiddlerToTiddlyWebFormat.
 * 
 * @param {Tiddler} tiddler - the tiddler to convert to CouchDB format
 * @param {object} tiddlerInfo - The metadata about the tiddler that the sync mechanism of tiddlywiki provides.
 *                               This includes the revision and other metadata related to the tiddler that is not
 *                               included in the tiddler.
 * @static 
 * @private 
 * @returns {object} doc - An document object that represents the tiddler. Ready to be inserted into CouchDB 
 */
DbStore.prototype._convertToCouch = function convertToCouch(tiddler, tiddlerInfo) {
    var result = { fields: {} };
    if (tiddler) {
        $tw.utils.each(tiddler.fields, function (element, title, object) {
            if (title === "revision") {
                /* do not store revision as a field */
                return;
            }
            if (title === "_attachments" && !tiddler.isDraft()) {
                //Since the draft and the original tiddler are not the same document
                //the draft does not has the attachments
                result._attachments = element; //attachments should be stored out of fields object
                return;
            }
            // Convert fields to string
            result.fields[title] = tiddler.getFieldString(title);
        });
        // tags must stay as array, so fix it
        result.fields.tags = tiddler.fields.tags;
    }
    // Default the content type
    result.fields.type = result.fields.type || "text/vnd.tiddlywiki";
    result._id = this.mangleTitle(tiddler.fields.title);
    result._rev = tiddler.fields.revision; //Temporary workaround. Remove
    if (tiddlerInfo.adaptorInfo && tiddlerInfo.adaptorInfo._rev) {
        result._rev = tiddlerInfo.adaptorInfo._rev;
    }
    result._rev = this._validateRevision(result._rev);
    return result;
}

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
}