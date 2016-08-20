/*\
type: application/javascript
title: $:/plugins/danielo515/tiddlypouch/ui/config.js
module-type: library

Links the user interface with the configuration methods 
\*/

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

exports.refreshUI = function refreshUI(config) {
    updateDebugUI(config);
    updateSelectedDBUI(config);
    setSyncFlag();
    refreshDatabaseNamesUI();

};

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

function refreshDatabaseNamesUI() {
    var namesList = $tw.TiddlyPouch.config.getAllDBNames();
    $tw.wiki.addTiddler({title: DATABASE_NAMES , list: namesList, text: "{{!!list}}" })
}

exports.updateDebugHandler = function(event){
    var Active = $tw.wiki.getTiddlerText(DEBUG_ACTIVE) === 'yes';
    var Verbose = $tw.wiki.getTiddlerText(DEBUG_VERBOSE) === 'yes';
    var savedConfig = $tw.TiddlyPouch.config.readConfigTiddler();
    savedConfig.debug = {active: Active, verbose: Verbose};
    $tw.TiddlyPouch.config.update(savedConfig);
}

function updateDebugUI(config){
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_ACTIVE, text: boolToHuman(config.debug.active)}));
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_VERBOSE, text: boolToHuman(config.debug.verbose)}));
}

exports.updateSelectedDBHandler = function(event){
    var savedConfig = $tw.TiddlyPouch.config.readConfigTiddler();
    var uiConfig = $tw.wiki.getTiddlerData(SELECTED_DATABASE);

    savedConfig.selectedDbId = uiConfig.name;
    savedConfig.databases[uiConfig.name] = plainToNestedObject(uiConfig);
    $tw.TiddlyPouch.config.update(savedConfig);
}

function updateSelectedDBUI(config){
    var dbInfo = config.databases[config.selectedDbId];
    var uiConfig = flattenObject(dbInfo);
    $tw.wiki.addTiddler(new $tw.Tiddler({
        title: SELECTED_DATABASE,
        type: "application/json",
        text: JSON.stringify(uiConfig)
    }));
}

// source: https://gist.github.com/gdibble/9e0f34f0bb8a9cf2be43
var flattenObject = function(ob) {
    var toReturn = {};
    var flatObject;
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) {
            continue;
        }
        if ((typeof ob[i]) === 'object') {
            flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) {
                    continue;
                }
                toReturn[i + (!!isNaN(x) ? '.' + x : '')] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};

function plainToNestedObject(plain) {
    var result = {};
    $tw.utils.each(plain,
        function(value,key) {
            createChilds(result,key.split('.'),value)
        });
    return result;
    function createChilds(ob,keys,value){
        keys =  keys.slice(); // No side effects please
        var lastKey = keys.pop(); // Pop is handy but mutates the array
        var lastChild = keys.reduce(
            function(ob,k) {
                ob[k] = ob[k] || {};
                return ob[k];
            }
            ,ob);
        lastChild[lastKey] = value;
        return ob;
    }
}

/**
 * Translates true/false to yes/no
 * 
 * @param {Boolean} value
 * @returns {String}
 */
function boolToHuman(value) {
    return value ? "yes" : "no"
}

})();