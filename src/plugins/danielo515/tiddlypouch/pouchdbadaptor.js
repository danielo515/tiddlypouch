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
Reverse what mangleTitle does. Used to obtain title from _id (in convertFromSkinnyTiddler).
*/
//TODO Move to DbStore class
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
    $tw.TiddlyPouch.database.deleteTiddler(title)
    .then(callback.bind(callback,null))
    .catch(callback);
};

/** The response should include the tiddler fields as an object in the value property*/
PouchAdaptor.prototype.convertFromSkinnyTiddler = function (row) {
    row.value.title = this.demangleTitle(row.id); //inject the title because is not included in the fields
    return row.value;
}


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
    return $tw.TiddlyPouch.database._db.query("TiddlyPouch/skinny-tiddlers")
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
    this.logger.trace("Tiddler info ",options.tiddlerInfo);
    $tw.TiddlyPouch.database.addTiddler(tiddler,options)
        .then(function (saveInfo) {
            callback(null, { _rev: saveInfo.rev }, saveInfo.rev);
        })
        .catch(callback);
};

PouchAdaptor.prototype.loadTiddler = function (title, callback) {
   $tw.TiddlyPouch.database.getTiddler(title)
   .then( callback.bind(null,null)) // callback with null as error
   .catch( callback );
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
