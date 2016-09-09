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
        
        // Source: https://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html
        function createDesignDoc(name, mapFunction) {
            var ddoc = {
                _id: '_design/' + name,
                views: {
                }
            };
            ddoc.views[name] = { map: mapFunction.toString() };
            return ddoc;
        }

        /**
         * Creates generic conflict-handler functions.
         * The returned function logs a default message to the console in case of conflict,
         * otherwise it throws the error so the next catch on the promise chain can handle it 
         * 
         * @param {any} message the message the returned handler will log to the console in case of conflict
         * @returns {function} handler a function ready to be used inside a catch statement in a promise chain
         */
        function conflict (message){
            return function(err){
                if (err.status == 409) {
                    return logger.log(message);
                }
                throw err;
            }
        }
        
        /** The indexes that are going to be created on the local database */
        var indexes = 
        { 
            by_type: createDesignDoc('by_type', 
                                function(doc){ doc.fields.type && emit(doc.fields.type) }),
            by_module_type: createDesignDoc( 'by_module_type', 
                                function(doc){ doc.fields['module-type'] && emit(doc.fields['module-type']) })
                    } ;

        $tw.TiddlyPouch.designDocument = buildDesignDocument();

        /* Here is where startup stuff really starts */

        $tw.TiddlyPouch.PouchDB = require("$:/plugins/danielo515/tiddlypouch/lib/pouchdb.js");
        $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB($tw.TiddlyPouch.config.currentDB.name);
        logger.log("Client side pochdb started");
        if ($tw.TiddlyPouch.config.debug.isActive()) {
            $tw.TiddlyPouch.database.on('error', function (err) { logger.log(err); });
        }

        $tw.TiddlyPouch.database.put($tw.TiddlyPouch.designDocument)
        .then(function () {
            logger.log("PouchDB design document created");
        }).catch(
            conflict("Design document exists already")
        ).then(function(){
            logger.log("Creating index by type...");
            return $tw.TiddlyPouch.database.put(indexes.by_type);
        }).then(function(){
            logger.log("Index by type created");
        }).catch(
            conflict("Index by_type exists already ")
        )
        /*Fetch and add the StoryList before core tries to save it*/
        .then(function() {
            return $tw.TiddlyPouch.database.get("$:/StoryList")
        }).then(function (doc) {
            $tw.wiki.addTiddler(new $tw.Tiddler(doc.fields, { title: doc._id, revision: doc._rev }));
            logger.log("StoryList was already in database ", doc.fields);
            return $tw.TiddlyPouch.database.get("$:/DefaultTiddlers")
        }).then(function(doc) {
           $tw.wiki.addTiddler(new $tw.Tiddler(doc.fields, { title: doc._id, revision: doc._rev }));
            logger.log("Default tiddlers loaded from database ", doc.fields);
        }).catch(function (err) {
            logger.log("Error retrieving StoryList or DefaultTiddlers");
            logger.log(err);
        }).then(callback);

    };

})();