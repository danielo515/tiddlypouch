/*\
title: $:/plugins/danielo515/tiddlypouch/utils/logger.js
type: application/javascript
module-type: library
A basic logging implementation

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
'use strict';

var Super = require('$:/core/modules/utils/logger.js').Logger;

/**
* Make a new logger
* @class
* @param {String} componentName - This will be displayed on the logging messages as header
* @param {Object|boolean} debug - A debug config object with debug and verbose booleans or a boolean indicating that debug level is active
* @param {boolean} verbose - if verbose debug level is active (used on trace method)
*
*/
function Logger(componentName, debug, verbose ) {
    Super.call(this, componentName);

    if ( typeof debug === 'object' ){
        verbose = debug.verbose;
        debug = debug.debug;
    }
    this.isDebug = debug || this.isDebugActive; // prototype overridable
    this.isVerbose = verbose;
}

Logger.prototype = Object.create(Super.prototype);
Logger.prototype.constructor = Super;

/**
 * Log only if there is debug enabled
 * @returns {undefined} returns nothing
 */
Logger.prototype.debug = function(){
    if (!this.isDebug){
        return;
    }
    this.log.apply(this, Array.prototype.slice.call(arguments, 0));
};

/**
 * Log only if debug is verbose
 * @returns {undefined} returns nothing
 */
Logger.prototype.trace = function(){
    if (!this.isVerbose){
        return;
    }
    this.debug.apply(this, Array.prototype.slice.call(arguments, 0));
};

exports.Logger = Logger;

