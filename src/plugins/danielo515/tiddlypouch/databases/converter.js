/*\
title: $:/plugins/danielo515/tiddlypouch/converters/converter.js
type: application/javascript
module-type: library

Basic converter. Used by other decorators (AKA converters) 

@preserve

\*/

'use strict'

/*jslint node: true, browser: true */
/*global $tw: false */
/* global module */
/** @namespace {converters} converter */

/**====================EXPORTS============================ */
module.exports.decorate = Converter;

/**
 * Base converter decorator
 * 
 * @param {any} db - database to decorate with this converter methods
 * @returns {any} db - the same db but decorated with the methods of this converter
 */
function Converter(db) {
    /**===================== CONVERSIONS BETWEEN TW AND PouchDB ============= */
    /**
    * CouchDB does not like document IDs starting with '_'.
    * Convert leading '_' to '%5f' and leading '%' to '%25'
    * Only used to compute _id / URL for a tiddler. Does not affect 'title' field.
    * @param {String} title The title of the tiddler to mangle
    * @return {String} The same title ready to be inserted into PouchDB/couchdb
    */
    db._mangleTitle = function mangleTitle(title) {
        if (title.length == 0) {
            return title;
        }
        var firstChar = title.charAt(0);
        var restOfIt = title.substring(1);
        if (firstChar === '_') {
            return '%5f' + restOfIt;
        }
        else if (firstChar === '%') {
            return '%25' + restOfIt;
        }
        else {
            return title;
        }
    };

    return db;

}