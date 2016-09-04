/*\
title: $:/plugins/danielo515/tiddlypouch/utils/logger.js
type: application/javascript
module-type: library
A basic logging implementation

@preserve

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Super = require('$:/core/modules/utils/logger.js').Logger;

/*
Make a new logger
*/
function Logger(componentName, debug , verbose ) {
    Super.call(this,componentName);

    if( typeof debug === "object" ){
        verbose = debug.verbose;
        debug = debug.debug
    }
    this.isDebug = debug;
    this.isVerbose = verbose;
}

Logger.prototype = Object.create(Super.prototype);
Logger.prototype.constructor = Super;

/**
 * Log only if there is debug enabled
 */
Logger.prototype.debug = function(){
    if(!this.isDebug){
        return 
    }
    this.log.apply(this, Array.prototype.slice.call(arguments,0))
}

/**
 * Log only if debug is verbose
 */
Logger.prototype.trace = function(){
    if(!this.isVerbose){
        return 
    }
    this.debug.apply(this, Array.prototype.slice.call(arguments,0))
}

exports.Logger = Logger;

}());