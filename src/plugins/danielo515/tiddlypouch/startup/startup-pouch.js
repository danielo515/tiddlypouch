/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouch.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
/*global emit: false*/
'use strict';

// Export name and synchronous status
exports.name = 'pouchdb';
exports.before = [ 'startup' ];
exports.platforms = [ 'browser' ];
exports.synchronous = false;

exports.startup = function (callback) {
    /* --- Declaration ZONE ---*/
    //============================

    var logger = new $TPouch.Logger('PouchStartup');
    var DbRouter = require('@plugin/databases/router.js');
    var Routes = require('@plugin/databases/routes');

    /* Here is where startup stuff really starts */
    $TPouch._db = $TPouch._db || new PouchDB($TPouch.config.currentDB.name);
    $TPouch.database = $TPouch.DbStore($TPouch.config.currentDB.name, 'tiddlers', $TPouch._db);
    /** The plugins DbStore points to the same PouchDB as the tiddlers one, but they have different methods internally */
    $TPouch.plugins = $TPouch.DbStore('__TP_plugins', 'plugins', $TPouch._db);
    $TPouch.router = DbRouter.createRouter($TPouch.database);
    /**Add the plugins route and database to the router.
   *
   */
    $TPouch.router
        .addRoute(Routes.plugins)
        .addDestination('__TP_plugins', $TPouch.plugins);

    logger.log('Client side dbs created');
    if ($TPouch.config.debug.isActive()) {
        $TPouch.database._db.on('error', function (err) { logger.log(err); debugger; });
    }
    /** ========= Create the required indexes (in parallel!) to operate the DBs =======*/
    Promise.all([
    //   $TPouch.plugins.createIndex('by_plugin_type', function (doc) { doc.fields && doc.fields['plugin-type'] && emit(doc.fields['plugin-type']) })
    // , $TPouch.database.createIndex('by_type', function (doc) { doc.fields.type && emit(doc.fields.type) })
    /*  ==== SKINNY TIDDLERS INDEX ===*/
        $TPouch.database.createIndex('skinny_tiddlers', function (doc) {
            if (doc.fields['plugin-type']) { // skip plugins!
                return;
            }
            var fields = {};
            for (var field in doc.fields) {
                if ([ 'text' ].indexOf(field) === -1) {
                    fields[field] = doc.fields[field];
                }
            }
            fields.revision = doc._rev;
            emit(doc._id, fields);
        })
        /*  ==== STARTUP TIDDLERS INDEX ===*/
        , $TPouch.database.createIndex('startup_tiddlers', function (doc) {

            const titles = [ '$:/palette', '$:/status/UserName', '$:/config/SyncFilter' ]; // list of startup titles
            doc.fields &&
        (
            (doc.fields.tags && doc.fields.tags.indexOf('$:/tags/Macro') !== -1)
          || (doc.fields.tags && doc.fields.tags.indexOf('$:/tags/Palette') !== -1)
          || titles.indexOf(doc.fields.title) !== -1
          || doc.fields.type === 'application/javascript'
          || !!doc.fields['plugin-type']
        )
        && emit(doc.id);

        })
    ]).catch(function (reason) {

        logger.log('Something went wrong during index creation', reason);
    }).then(function () { /*Fetch and add the StoryList before core tries to save it*/

        return $TPouch.database.getTiddler('$:/StoryList');
    }).then(function (tiddlerFields) {

        $tw.wiki.addTiddler(tiddlerFields);
        logger.debug('StoryList was already in database ', tiddlerFields);
        return $TPouch.database.getTiddler('$:/DefaultTiddlers');
    }).then(function (tiddlerFields) {

        $tw.wiki.addTiddler(tiddlerFields);
        logger.log('Default tiddlers loaded from database ', tiddlerFields);
    }).catch(function (err) {

        logger.log('Error retrieving StoryList or DefaultTiddlers');
        logger.debug(err);
    }).then(function () {

        logger.log('Client side dbs initialized');
        callback();
    });

};
