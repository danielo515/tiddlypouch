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

    var CONFIG_PREFIX = "$:/plugins/danielo515/tiddlypouch/config/";

    exports.startup = function (callback) {
        /* --- Declaration ZONE ---*/
        //============================

        var logger = new $tw.TiddlyPouch.Logger("PouchStartup");

        // This function creates just the skinny view.
        // it is legacy code, but makes TP compatible with couchdb plugin
        // because it installs the required view on the server.
        function buildDesignDocument() {
            /* This builds the design document.
               Each tiddler conforming the design document elements should be a  tiddler
               with just one anonimous function*/
            var design_document = JSON.parse($tw.wiki.getTiddler(CONFIG_PREFIX + "design_document").fields.text),
                /*To be valid json functions should be just one line of text. That's why we remove line breaks*/
                skinny_view = $tw.wiki.getTiddler(CONFIG_PREFIX + "skinny-tiddlers-view").fields.text.replace(/\r?\n/, ' '),
                filter = $tw.wiki.getTiddler(CONFIG_PREFIX + "design_document/filter").fields.text.replace(/\r?\n/, ' ');

            design_document.views['skinny-tiddlers'].map = skinny_view;
            design_document.filters.tiddlers = filter;
            return design_document;
        }

        /**
         * Creates generic conflict-handler functions.
         * The returned function logs a default message to the console in case of conflict,
         * otherwise it throws the error so the next catch on the promise chain can handle it 
         * 
         * @param {any} message the message the returned handler will log to the console in case of conflict
         * @returns {function} handler a function ready to be used inside a catch statement in a promise chain
         */
        function conflict(message) {
            return function (err) {
                if (err.status == 409) {
                    return logger.log(message);
                }
                throw err;
            }
        }

        $tw.TiddlyPouch.designDocument = buildDesignDocument();

        /* Here is where startup stuff really starts */

        $tw.TiddlyPouch.database = $tw.TiddlyPouch.DbStore($tw.TiddlyPouch.config.currentDB.name);
        logger.log("Client side pochdb started");
        if ($tw.TiddlyPouch.config.debug.isActive()) {
            $tw.TiddlyPouch.database._db.on('error', function (err) { logger.log(err); });
        }

        $tw.TiddlyPouch.database._db.put($tw.TiddlyPouch.designDocument)
            .then(function () {
                logger.log("Skinny tiddlers view created");
            }).catch(
            conflict("Design document exists already")
            ).then(function () {
                return $tw.TiddlyPouch.database.createIndex('by_type', function (doc) { doc.fields.type && emit(doc.fields.type) });
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