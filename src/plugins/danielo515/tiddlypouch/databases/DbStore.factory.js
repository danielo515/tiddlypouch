/*\
title: $:/plugins/danielo515/tiddlypouch/dbstore/factory
type: application/javascript
module-type: library

A factory of DbStores. This factory is responsible of instantiating the DbStores and inject them the required dependecies

@preserve

\*/

'use strict'

/*jslint node: true, browser: true */
/*global $tw: false */

module.exports = factory;

/** The dbStore class should export a function constructor. @see DbStore */
var DbStore = require('$:/plugins/danielo515/tiddlypouch/DbStore.js');
/** This list should be built automatically based on some kind of module system,
 * but for the moment, just create it manually
 */
var converters = { 
    'tiddler': require('$:/plugins/danielo515/tiddlypouch/converters/tiddler'),
    'plugins': require('$:/plugins/danielo515/tiddlypouch/converters/plugins')
}; 

/**
 * Factory that instantiates DbStores.
 * 
 * It is responsible of injecting the tiddler conversion logic into the instantiated database.
 * Conversion logic is extracted from a list of converter modules.
 * Each converther should inject the following interface:
 * <pre>
 *  _convertFromCouch: returns a document representation of the tiddler
 * _convertToCouch: returns a tiddler fields representation of the given object
 * _mangleTitle: returns a title compatible with the destination database based on the given title
 * </pre>
 * @see DbStore
 * 
 * @param {String} dbName the name of the database to instantiate. It will be created if it does not exist
 * @param {String} dbType the type of database you want. This determines the conversion logic, 
 *                        so basically this is a converter name.
 * @param {PouchDB} [dbToWrap] - An already existing database to wrap, instead of being created
 * @returns {DbStore} a ready to use instance of DbStore class with the conversion logic injected
 */
function factory( dbName, dbType , dbToWrap ){
    dbType = dbType || 'tiddler';
    var converter = converters[dbType];

    var db = new DbStore(dbName , dbToWrap);
    return converter.decorate(db);

}