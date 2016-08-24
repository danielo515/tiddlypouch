/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouch.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.
\*/
(function() {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    // Export name and synchronous status
    exports.name = "pouchdb";
    exports.before = ["startup"];
    exports.platforms = ["browser"];
    exports.synchronous = true;

    var CONFIG_PREFIX = "$:/plugins/danielo515/tiddlypouch/config/";

    exports.startup = function () {
        /* --- Declaration ZONE ---*/
        //============================

        var logger = new $tw.utils.Logger("PouchStartup");

        function buildDesignDocument() {
            /* This builds the design document.
               Each tiddler conforming the design document elements should be a  tiddler
               with just one anonimous function*/
            var design_document = $tw.wiki.getTiddlerData(CONFIG_PREFIX + "design_document"),
                /*To be valid json functions should be just one line of text. That's why we remove line breaks*/
                skinny_view = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "skinny-tiddlers-view").replace(/\r?\n/, ' '),
                filter = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "design_document/filter").replace(/\r?\n/, ' ');

            design_document.views['skinny-tiddlers'].map = skinny_view;
            design_document.filters.tiddlers = filter;
            return design_document;
        }

        function getConfig(configName) {
            var configValue = $tw.wiki.getTiddlerText(CONFIG_PREFIX + configName, "");
            return configValue.trim();
        };

        /* --- TiddlyPouch namespace creation and basic initialization---*/
        $tw.TiddlyPouch.utils = {};
        $tw.TiddlyPouch.designDocument = buildDesignDocument();

        /* Here is where startup stuff really starts */

        $tw.TiddlyPouch.PouchDB = require("$:/plugins/danielo515/tiddlypouch/lib/pouchdb.js");
        $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB($tw.TiddlyPouch.config.currentDB.name);
        logger.log("Client side pochdb started");
        if ($tw.TiddlyPouch.config.debug.isActive()) {
            $tw.TiddlyPouch.database.on('error', function (err) { logger.log(err); });
        }

        $tw.TiddlyPouch.database.put($tw.TiddlyPouch.designDocument).then(function () {
            logger.log("PouchDB design document created");
        }).catch(function(err) {
            if (err.status == 409){
                logger.log("Design document exists already");}
        });

        /*Fetch and add the StoryList before core tries to save it*/
        $tw.TiddlyPouch.database.get("$:/StoryList").then(function (doc) {
            $tw.wiki.addTiddler(new $tw.Tiddler(doc.fields, { title: doc._id, revision: doc._rev }));
            logger.log("StoryList is already in database ", doc.fields);
        }).catch(function(err) {
            logger.log("Error retrieving StoryList");
            logger.log(err);
        });

    };

})();