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
var DEBUG_ACTIVE = DEBUG_CONFIG + '/Active';
var DEBUG_VERBOSE = DEBUG_CONFIG + '/Verbose';

exports.updateDebugHandler = function(event){
    console.log(event.param);
    var Active = $tw.wiki.getTiddlerText(DEBUG_ACTIVE) === 'yes';
    var Verbose = $tw.wiki.getTiddlerText(DEBUG_VERBOSE) === 'yes';
    var savedConfig = $tw.TiddlyPouch.config.readConfigTiddler();
    savedConfig.debug = {active: Active, verbose: Verbose};
    $tw.TiddlyPouch.config.update(savedConfig);
}

exports.updateDebug = function(config){
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_ACTIVE, text: boolToHuman(config.debug.active)}));
    $tw.wiki.addTiddler(new $tw.Tiddler({title: DEBUG_VERBOSE, text: boolToHuman(config.debug.verbose)}));
}

function boolToHuman(value){
    return value ? "yes" : "no" 
}

})();