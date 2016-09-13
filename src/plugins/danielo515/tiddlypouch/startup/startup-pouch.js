/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouch.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    /*global emit: false*/
    "use strict";

    // Export name and synchronous status
    exports.name = "pouchdb";
    exports.before = ["startup"];
    exports.platforms = ["browser"];
    exports.synchronous = false;

    exports.startup = function (callback) {
        /* --- Declaration ZONE ---*/
        //============================

        var logger = new $tw.TiddlyPouch.Logger("PouchStartup");
        var DbRouter = require("$:/plugins/danielo515/tiddlypouch/database/router.js");

        /* Here is where startup stuff really starts */

        $tw.TiddlyPouch.database = $tw.TiddlyPouch.DbStore($tw.TiddlyPouch.config.currentDB.name);
        $tw.TiddlyPouch.router = DbRouter.createRouter( $tw.TiddlyPouch.database );
        logger.log("Client side pochdb started");
        if ($tw.TiddlyPouch.config.debug.isActive()) {
            $tw.TiddlyPouch.database._db.on('error', function (err) { logger.log(err); });
        }
        /** Create the required index to operate the DB  */
        $tw.TiddlyPouch.database.createIndex('by_type', function (doc) { doc.fields.type && emit(doc.fields.type) })
            .then(function () {
                return $tw.TiddlyPouch.database.createIndex('skinny_tiddlers', function (doc) {
                    var fields = {};
                    for (var field in doc.fields) {
                        if (['text'].indexOf(field) === -1) {
                            fields[field] = doc.fields[field];
                        }
                    }
                    fields.revision = doc._rev;
                    emit(doc._id, fields);
                })
            })
            /*Fetch and add the StoryList before core tries to save it*/
            .then(function () {
                return $tw.TiddlyPouch.database.getTiddler("$:/StoryList")
            }).then(function (tiddlerFields) {
                $tw.wiki.addTiddler(tiddlerFields);
                logger.debug("StoryList was already in database ", tiddlerFields);
                return $tw.TiddlyPouch.database.getTiddler("$:/DefaultTiddlers")
            }).then(function (tiddlerFields) {
                $tw.wiki.addTiddler(tiddlerFields);
                logger.log("Default tiddlers loaded from database ", tiddlerFields);
            }).catch(function (err) {
                logger.log("Error retrieving StoryList or DefaultTiddlers");
                logger.log(err);
            }).then(callback);

    };

})();