/*\
title: $:/plugins/danielo515/tiddlypouch/pouchadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with local PouchDB


@preserve

\*/


/*jslint node: false, browser: true */
/*global $tw: false, XMLHttpRequest: false */
"use strict";


/**
 * Creates the pouch sync adaptor 
 * @constructor 
 * @param {any} options
 */
function PouchAdaptor(options) {
    this.wiki = options.wiki;
    var Debug = $tw.TiddlyPouch.config.debug;
    this.logger = new $tw.TiddlyPouch.Logger("PouchAdaptor", Debug.isActive(), Debug.isVerbose() );
    this.sessionUrl = $tw.TiddlyPouch.config.currentDB.getUrl("_session"); // save the URL on startup
    //this.readConfig()
}

/**
* Copied from TiddlyWiki5 core/modules/utils/dom/http.js to add support for xhr.withCredentials
*/
function httpRequest(options) {
    var type = options.type || "GET",
        headers = options.headers || { accept: "application/json" },
        request = new XMLHttpRequest(),
        data = "",
        results;
    // Massage the data hashmap into a string
    if (options.data) {
        if (typeof options.data === "string") { // Already a string
            data = options.data;
        } else { // A hashmap of strings
            results = [];
            $tw.utils.each(options.data, function (dataItem, dataItemTitle) {
                results.push(dataItemTitle + "=" + encodeURIComponent(dataItem));
            });
            data = results.join("&");
        }
    }
    // for CORS if required
    if (options.withCredentials) {
        request.withCredentials = true;
    }
    // Set up the state change handler
    request.onreadystatechange = function () {
        if (this.readyState === 4) {
            if (this.status === 200 || this.status === 201 || this.status === 204) {
                // Success!
                options.callback(null, this.responseText, this);
                return;
            }
            // Something went wrong
            options.callback("XMLHttpRequest error code: " + this.status);
        }
    };
    // Make the request
    request.open(type, options.url, true);
    if (headers) {
        $tw.utils.each(headers, function (header, headerTitle, object) {
            request.setRequestHeader(headerTitle, header);
        });
    }
    if (data && !$tw.utils.hop(headers, "Content-type")) {
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=UTF-8");
    }
    request.send(data);
    return request;
}

/**
* CouchDB does not like document IDs starting with '_'.
* Convert leading '_' to '%5f' and leading '%' to '%25'
* Only used to compute _id / URL for a tiddler. Does not affect 'title' field.
*/
PouchAdaptor.prototype.mangleTitle = function (title) {
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
Reverse what mangleTitle does. Used to obtain title from _id (in convertFromSkinnyTiddler).
*/
PouchAdaptor.prototype.demangleTitle = function (title) {
    if (title.length < 3) {
        return title;
    }
    var firstThree = title.substring(0, 3);
    var restOfIt = title.substring(3);
    if (firstThree === '%5f') {
        return '_' + restOfIt;
    }
    else if (firstThree === '%25') {
        return '%' + restOfIt;
    }
    else {
        return title;
    }
}

PouchAdaptor.prototype.deleteTiddler = function (title, callback, options) {
    if (!options.tiddlerInfo || !options.tiddlerInfo.adaptorInfo || typeof options.tiddlerInfo.adaptorInfo._rev == "undefined") {
        /* not on server, just return OK */
        callback(null);
    }
    $tw.TiddlyPouch.database.get(title).then(function (doc) {
        doc._deleted = true;
        return $tw.TiddlyPouch.database.put(doc);
    })
    .then(callback.bind(callback,null))
    .catch(callback);
};

/** The response should include the tiddler fields as an object in the value property*/
PouchAdaptor.prototype.convertFromSkinnyTiddler = function (row) {
    row.value.title = this.demangleTitle(row.id); //inject the title because is not included in the fields
    return row.value;
}


/**
 * Copy all fields to "fields" sub-object except for the "revision" field.
 * See also: TiddlyWebAdaptor.prototype.convertTiddlerToTiddlyWebFormat.
 * 
 * @param {Tiddler} tiddler the tiddler to convert to CouchDB format
 * @param {object} tiddlerInfo The metadata about the tiddler that the sync mechanism of tiddlywiki provides.
 *                             This includes the revision and other metadata related to the tiddler that is not
 *                              included in the tiddler.
 * @returns {object} doc An document object that represents the tiddler. Ready to be inserted into CouchDB 
 */
PouchAdaptor.prototype.convertToCouch = function (tiddler, tiddlerInfo) {
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
    result._rev = validateRevision(result._rev);
    return result;
}

/** for this version just copy all fields across except _rev and _id */
PouchAdaptor.prototype.convertFromCouch = require('$:/plugins/danielo515/tiddlypouch/utils').convertFromCouch;

/**
 * returns the revisions of a given tiddler.
 * Only available revisions are returned
 * @param {string} title The tiddler's title you want the revisions
 * @return {promise} promise that fulfills to an array of revisions
 */
PouchAdaptor.prototype.getRevisions = function (title) {
    var db = $tw.TiddlyPouch.database;
    return db.get(title, { revs_info: true })
        .then(function (document) {
            var revisions = document._revs_info.filter(onlyAvailable).map(getRevisionId);
            return revisions;
        });

    function onlyAvailable(rev) { return rev.status === "available"; }
    function getRevisionId(rev) { return rev.rev; }
}


PouchAdaptor.prototype.loadRevision = function (title, revision) {
    var self = this;
    self.logger.debug('Fetching revision ', revision, ' of tiddler ', title, ' from database');
    return $tw.TiddlyPouch.database.get(self.mangleTitle(title), { rev: revision })
        .then(self.convertFromCouch)
};

/**
 * Updates a document on the database if it exists.
 * Creates a new document if it does not exist.
 * If the document has a revision but it is new it will throw a conflict
 * so we look for it and if we get a 404 (not found) we remove the revision
 * and try to create it again.
 *
 * @param {any} document  It should be a document ready to be inserted,
 *                          no conversion from TW format will be performed.
 * @returns {promise}
 */
PouchAdaptor.prototype._upsert = function (document) {
    var self = this;
    var db = $tw.TiddlyPouch.database;
    return db.put(document)
        .then(function (saveInfo) {
            return saveInfo
        })
        .catch(function (err) {
            if (err) {
                if (err.name === 'conflict') { // check if it is a real conflict
                    self.logger.debug('O my gosh, update conflict!')
                    return db.get(document._id)
                        .then(function (document) { //oops, we got a document, this was an actual conflict
                            self.logger.log("A real update conflict!", document);
                            throw err; // propagate the error for the moment
                        })
                        .catch(function (err) {
                            if (err.name === 'not_found') { // not found means no actual conflict
                                self.logger.debug("Fake conflict, trying again", document);
                                document._rev = null;
                                return db.put(document);
                            }
                        });

                }
                throw err //propagate the error if it is not a conflict
            }

        });

};

/**
 * Validates the passed revision according to PouchDB revision format.
 * If the revision passes the validation thes it is returned.
 * If it does not, null is returned
 * 
 * @param {string} rev the revision to validate
 * @returns {string|null} 
 */
function validateRevision(rev) {
    if (/\d+-[A-z0-9]*/.test(rev)) {
        return rev
    }
    return null
}


/*****************************************************
 ****** Tiddlywiki required methods
 *****************************************************/

PouchAdaptor.prototype.getStatus = function (callback) {
    var self = this;
    if (!self.sessionUrl) {
        return callback(null, false, "NON-AUTHENTICATED")
    }
    httpRequest({
        url: self.sessionUrl,
        withCredentials: true,
        callback: function (err, data) {
            if (err) {
                return callback(err);
            }
            var json = null;
            var isLoggedIn = false;
            var username = null;
            try {
                json = JSON.parse(data);
            } catch (e) {
            }
            if (json && json.userCtx) {
                username = json.userCtx.name;
                isLoggedIn = (username !== null);
                if (!isLoggedIn && json.userCtx.roles.length == 1 && json.userCtx.roles[0] === '_admin') {
                    // admin party mode
                    self.logger('Warning! Server is on admin party mode!')
                    isLoggedIn = true;
                }
            }
            // If we are logged but there is no onlineDB means that there is a cookie
            // We have to create the database which will pick up the cookie.
            // TW will not call the login method if we are already logged in, even if the user clicks on login.
            if (isLoggedIn && !$tw.TiddlyPouch.onlineDB) {
                self.login(); // this creates the online database
            }
            callback(null, isLoggedIn, username);
        }
    });
}

PouchAdaptor.prototype.getTiddlerInfo = function (tiddler) {
    return { _rev: tiddler.fields.revision };
};

/**
 * Returns an array of skinny tiddlers (tiddlers withouth text field)
 * They are converted from CouchDB documents to TW tiddlers
 * Both callbacks and promises are supported.
 * @param {function} callback an optional callback to call with the converted tiddlers
 * @return {promise} Skinnytiddlers a promise that fulfills to an array of skinny tiddlers
 */
PouchAdaptor.prototype.getSkinnyTiddlers = function (callback) {
    var self = this;
    return $tw.TiddlyPouch.database.query("TiddlyPouch/skinny-tiddlers")
        .then(function (tiddlersList) {
            var tiddlers = tiddlersList.rows
            self.logger.trace("Skinnytiddlers: ", tiddlers);
            for (var i = 0; i < tiddlers.length; i++) {
                tiddlers[i] = self.convertFromSkinnyTiddler(tiddlers[i]);
            }
            if(callback){ // handle non-promise callback flows 
                callback(null, tiddlers);
            }
            // Continue the chain
            return tiddlers 
        }).catch(callback || self.logger.log.bind(self.logger));

};

/**
 * 
 */
PouchAdaptor.prototype.saveTiddler = function (tiddler, callback, options) {
    var self = this;
    var convertedTiddler = this.convertToCouch(tiddler, options.tiddlerInfo);
    $tw.TiddlyPouch.config.debug.isActive() && this.logger.log(options.tiddlerInfo);
    this.logger.debug("Saving ", convertedTiddler);
    self._upsert(convertedTiddler)
        .then(function (saveInfo) {
            callback(null, { _rev: saveInfo.rev }, saveInfo.rev);
        })
        .catch(callback);
};

PouchAdaptor.prototype.loadTiddler = function (title, callback) {
    var self = this;
    self.logger.debug('Retrieving tiddler ', title, ' from database');
    $tw.TiddlyPouch.database.get(this.mangleTitle(title), function (error, doc) {
        if (error) {
            callback(error);
        } else {
            // okay, doc contains our document
            callback(null, self.convertFromCouch(doc));
        }
    });
};

PouchAdaptor.prototype.isReady = function () {
    // Since pouchdb handles the sync to the server we declare ourselves allways ready.
    return true;
};


PouchAdaptor.prototype.login = function (username, password, callback) {
    var self = this;
    /* Instead of manual logging, let's allow that task to Pouchdb
    var options = {
        url: self.sessionUrl,
        type: "POST",
        data: {
            name: username,
            password: password
        },
        withCredentials: true,
        callback: function(err, data) {
            callback(err);
        }
    };

    httpRequest(options);*/

    self.logger.log('Trying to sync...');

    /* Here is where startup stuff really starts */
    var onlineDB = $tw.TiddlyPouch.newOnlineDB({ username: username, password: password });
    if (!onlineDB) {
        self.logger.log("Warning, sync is not possible because no onlineDB");
        return callback('There is no online DB set');
    }
    $tw.TiddlyPouch.onlineDB = onlineDB;
    $tw.TiddlyPouch.startSync(onlineDB).then(callback);
}

PouchAdaptor.prototype.logout = function (callback) {
    var self = this;
    var options = {
        url: self.sessionUrl,
        type: "DELETE",
        withCredentials: true,
        callback: function (err) {
            callback(err);
        }
    };
    httpRequest(options);
}

//--- END TEMPT COMMENT */

if ($tw.browser && $tw.TiddlyPouch.database) {
    /*Only works if we are on browser and there is a database*/
    exports.adaptorClass = PouchAdaptor;
}

