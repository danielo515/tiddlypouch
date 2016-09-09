/*\
type: application/javascript
title: $:/plugins/danielo515/tiddlypouch/ui/config.js
module-type: library

Links the user interface with the configuration methods 

@preserve

\*/

/** @module */

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var DEBUG_CONFIG = "$:/plugins/danielo515/tiddlypouch/config/Debug";
var DEBUG_ACTIVE = DEBUG_CONFIG + "/Active";
var DEBUG_VERBOSE = DEBUG_CONFIG + "/Verbose";
var DATABASE_NAMES = "$:/plugins/danielo515/tiddlypouch/config/database_names";
var SELECTED_DATABASE = "$:/plugins/danielo515/tiddlypouch/config/selected_database";
var SYNC_ICON = "$:/plugins/danielo515/tiddlypouch/ui/sync-flag";

var Utils = require('$:/plugins/danielo515/tiddlypouch/utils');

exports.refreshUI = function refreshUI(config) {
    updateDebugUI(config);
    refreshSelectedDBUI(config.databases[config.selectedDbId]);
    setSyncFlag();
    refreshDatabaseNamesUI();
    setLoginMessage();
    setSiteSubtitleToDatabaseName();
};

exports.handlers = {};

function setSyncFlag(mode) {
    var sincStatusFlag = $tw.wiki.getTiddler(SYNC_ICON);
    /* Because I'm unsure about how to decide if we are in offline mode
        i can take both, a message param or just a plain function execution.
        take a look at startup-syncer for the emit of the events
    */
    if (mode === "offline" || !$tw.TiddlyPouch.config.currentDB.getUrl()) {
        /* We don't want sync status icon on sidebar*/
        return $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags: []})); //Remove tags
    }
    /*Otherwise, add to sidebar with the tag (it could be removed) */
    $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags: ['$:/tags/PageControls']}));
}

exports.setSyncFlag = setSyncFlag;

function setSiteSubtitleToDatabaseName() {
    var text = "<<tiddlypouch-tab " + $tw.TiddlyPouch.config.currentDB.name + " Database >>";
    $tw.wiki.addTiddler({ title: "$:/SiteSubtitle", text: text });
}

/**
 * Sets the message "Login to <xxx>" that is showed by tiddlywiki
 * to remote URL of the current database.  
 */
function setLoginMessage() {
    var loginDestination = $tw.TiddlyPouch.config.currentDB.getUrl();
    var databaseName = $tw.TiddlyPouch.config.currentDB.getRemoteName();
    var message = "Login to remote database <b>" + databaseName + "</b> at: " + loginDestination;
    $tw.wiki.addTiddler({
        title: "$:/language/LoginToTiddlySpace" ,
        text: message
    });

}

function refreshDatabaseNamesUI() {
    var namesList = $tw.TiddlyPouch.config.getAllDBNames();
    $tw.wiki.addTiddler({title: DATABASE_NAMES , list: namesList, text: "{{!!list}}" })
}

exports.handlers.updateDebug = function(event){
    var Active = $tw.wiki.getTiddlerText(DEBUG_ACTIVE) === 'yes';
    var Verbose = $tw.wiki.getTiddlerText(DEBUG_VERBOSE) === 'yes';
    var savedConfig = $tw.TiddlyPouch.config.readConfigTiddler();
    savedConfig.debug = {active: Active, verbose: Verbose};
    $tw.TiddlyPouch.config.update(savedConfig);
}

/**
 *  Updates the debug ui to reflect the configuration 
 * 
 * @param {Object} config
 */
function updateDebugUI(config){
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_ACTIVE, text: Utils.boolToHuman(config.debug.active)}));
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_VERBOSE, text: Utils.boolToHuman(config.debug.verbose)}));
}

/**
 * Updates the databases section of the stored configuration 
 * with new values for one database from the user interface.
 * Note that the configuration being updated may not be the configuratin of the currentDB,
 * the user can select a DB different from the curent one and save that config.
 */
exports.handlers.updateDbConfig = function(event){
    var savedConfig = $tw.TiddlyPouch.config.readConfigTiddler();
    var uiConfig = $tw.wiki.getTiddlerData(SELECTED_DATABASE);

    savedConfig.selectedDbId = uiConfig.name;
    savedConfig.databases[uiConfig.name] = Utils.plainToNestedObject(uiConfig);
    $tw.TiddlyPouch.config.update(savedConfig);
}

/**
 * Event handler that should be triggered when a database name is selected.
 * It loads it's configuration and refreshes the UI with it.
 */
exports.handlers.databaseHasBeenSelected = function(event) {
    var dbName = event.param;
    var dbConfig = $tw.TiddlyPouch.config.getDatabaseConfig(dbName);
    refreshSelectedDBUI(dbConfig);
}

/**
 * Refreshes the UI with the provided database configuration
 * 
 * @param {Object} dbConfig
 */
function refreshSelectedDBUI(dbConfig) {
    //var dbInfo = config.databases[config.selectedDbId];
    var uiConfig = Utils.flattenObject(dbConfig);
    $tw.wiki.addTiddler(new $tw.Tiddler({
        title: SELECTED_DATABASE,
        type: "application/json",
        text: JSON.stringify(uiConfig)
    }));
}

})();