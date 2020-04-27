/*\
type: application/javascript
title: $:/plugins/danielo515/tiddlypouch/ui/config.js
module-type: library

Links the user interface with the configuration methods

@preserve

\*/

'use strict';
/** @module */

//@ts-check

/*jslint node: true, browser: true */
/*global $tw: false */

/**
 * @typedef {import('../startup/startup-config').tpouchConfig} tpouchConfig
 */

var SELECTED_DATABASE =
    '$:/plugins/danielo515/tiddlypouch/config/selected_database';
const {
    CONFIG_SAVED,
    SYNC_ICON,
    DATABASE_NAMES,
    DEBUG_CONFIG,
} = require('@plugin/constants.js');

var Utils = require('@plugin/utils');

$TPouch.ui = $TPouch.ui || {};

$TPouch.ui.refresh = exports.refreshUI = function refreshUI(config) {
    updateDebugUI(config);
    refreshSelectedDbUi(config.databases[config.selectedDbId]);
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
    if (mode === 'offline' || !$TPouch.config.currentDB.getUrl()) {
        /* We don't want sync status icon on sidebar*/
        return $tw.wiki.addTiddler(
            new $tw.Tiddler(sincStatusFlag, { tags: [] })
        ); //Remove tags
    }
    /*Otherwise, add to sidebar with the tag (it could be removed) */
    $tw.wiki.addTiddler(
        new $tw.Tiddler(sincStatusFlag, { tags: [ '$:/tags/PageControls' ] })
    );
}

exports.setSyncFlag = setSyncFlag;

function setSiteSubtitleToDatabaseName() {
    var text =
        `<<tiddlypouch-tab ${  $TPouch.config.currentDB.name  } Database >>`;
    $tw.wiki.addTiddler({ title: '$:/SiteSubtitle', text: text });
}

/**
 * Sets the message "Login to <xxx>" that is showed by tiddlywiki
 * to remote URL of the current database.
 */
function setLoginMessage() {
    var loginDestination = $TPouch.config.currentDB.getUrl();
    var databaseName = $TPouch.config.currentDB.getRemoteName();
    var message =
        `Login to remote database <b>${
            databaseName
        }</b> at: ${
            loginDestination }`;
    $tw.wiki.addTiddler({
        title: '$:/language/LoginToTiddlySpace',
        text: message,
    });
}

function refreshDatabaseNamesUI() {
    var namesList = $TPouch.config.getAllDBNames();
    $tw.wiki.addTiddler({
        title: DATABASE_NAMES,
        list: namesList,
        text: '{{!!list}}',
    });
}

function tryParse(value) {
    try {
        return JSON.parse(value);
    } catch (err) {
        return value;
    }
}
/**
 * Returns the fields of a tiddler as a POJO
 * parsing values as needed (booleans, numbers, arrays...)
 * @param {string} title the title of the tiddler
 */
function getTiddlerFields(title) {
    const tiddler = $tw.wiki.getTiddler(title) || { fields: {} };
    const result = {};
    $tw.utils.each(tiddler.fields, (val, key) => {
        result[key] = tryParse(val);
    });
    return result;
}

exports.handlers.updateDebug = function (/**event */) {
    var rawConfig = getTiddlerFields(DEBUG_CONFIG);
    //@type { tpouchConfig }
    var savedConfig = $TPouch.config.readConfigTiddler();
    savedConfig.debug = {
        active: rawConfig.debug,
        verbose: rawConfig.verbose,
    };
    savedConfig.useFatTiddlers = rawConfig.useFatTiddlers;
    $TPouch.config.update(savedConfig);
};

/**
 *  Updates the debug ui to reflect the configuration
 *
 * @param {tpouchConfig} config
 */
function updateDebugUI(config) {
    $tw.wiki.addTiddler(
        new $tw.Tiddler({
            title: DEBUG_CONFIG,
            debug: JSON.stringify( config.debug.active ),
            verbose: JSON.stringify( config.debug.verbose ),
            useFatTiddlers: JSON.stringify( config.useFatTiddlers ),
        })
    );
}

/**
 * Updates the databases section of the stored configuration
 * with new values for one database from the user interface.
 * Note that the configuration being updated may not be the configuration of the currentDB,
 * the user can select a DB different than the current one and save that config.
 */
exports.handlers.updateDbConfig = function (/**event */) {
    const uiConfig = $tw.wiki.getTiddlerData(SELECTED_DATABASE);
    const debugConfig = getTiddlerFields(DEBUG_CONFIG); //TODO: unify both configs and save them at once
    //@type { tpouchConfig }
    const updateDescription = {
        // Instead of updating fields separately, we build an object describing just the new sections to add
        // and the update method will take care of updating the corresponding parts
        selectedDbId: uiConfig.name,
        useFatTiddlers: debugConfig.useFatTiddlers,
        databases: {
            [uiConfig.name]: Utils.plainToNestedObject(uiConfig),
        },
    };

    $TPouch.config
        .update(updateDescription)
        .then(() =>
            $tw.rootWidget.dispatchEvent({ type: CONFIG_SAVED, param: true })
        ); // when saved from UI, ask for a reboot
};

/**
 * Event handler that should be triggered when a database name is selected.
 * It loads it's configuration and refreshes the UI with it.
 */
exports.handlers.databaseHasBeenSelected = function (event) {
    var dbName = event.param;
    var dbConfig = $TPouch.config.getDatabaseConfig(dbName);
    refreshSelectedDbUi(dbConfig);
};

/**
 * Refreshes the UI with the provided database configuration
 *
 * @param {remoteConfig} dbConfig
 */
function refreshSelectedDbUi(dbConfig) {
    //var dbInfo = config.databases[config.selectedDbId];
    var uiConfig = Utils.flattenObject(dbConfig);
    $tw.wiki.addTiddler(
        new $tw.Tiddler({
            title: SELECTED_DATABASE,
            type: 'application/json',
            text: JSON.stringify(uiConfig),
        })
    );
}
