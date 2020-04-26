/*\
title: $:/plugins/danielo515/tiddlypouch/dbstore/factory
type: application/javascript
module-type: library

A factory of DbStores. This factory is responsible of instantiating the DbStores and inject them the required dependecies

@preserve

\*/

'use strict';

/*jslint node: true, browser: true */

module.exports = factory;

/** The dbStore class should export a function constructor. @see DbStore */
var DbStore = require('@plugin/DbStore.js');
/** This list should be built automatically based on some kind of module system,
 * but for the moment, just create it manually
 */
var converters = {
    'tiddlers': require('@plugin/databases/converters/tiddler'),
    'plugins': require('@plugin/databases/converters/plugins')
};

/**
 * Factory that instantiates DbStores.
 *
 * It is responsible of injecting the tiddler conversion logic into the instantiated database.
 * Conversion logic is extracted from a list of converter modules.
 * Each converter should decorate the database with the {@link DbDecorator} interface
 * @see DbStore
 *
 * @param {String} dbName the name of the database to instantiate. It will be created if it does not exist
 * @param {String} dbType the type of database you want. This determines the conversion logic,
 *                        so basically this is a converter name.
 * @param {PouchDB} [dbToWrap] - An already existing database to wrap, instead of being created
 * @returns {DbStore} a ready to use instance of DbStore class with the conversion logic injected
 */
function factory( dbName, dbType , dbToWrap ){
    dbType = dbType || 'tiddlers';
    var converter = converters[dbType];

    var db = new DbStore(dbName , dbToWrap);
    return converter.decorate(db);

}


/**
 * Should decorate any given {@link DbStore} with the following methods.
 * Monkey patching is the method used
 *
 * @interface DbDecorator
 */
/**
 *
 *
 * @function
 * @name DbDecorator#_convertToCouch
 *
 * @param {Tiddler} tiddler - the tiddler to convert to CouchDB format
 * @param {object} tiddlerInfo - The metadata about the tiddler that the sync mechanism of tiddlywiki provides.
 *                               This includes the revision and other metadata related to the tiddler that is not
 *                               included in the tiddler.
 * @returns {object} doc - An document object that represents the tiddler. Ready to be inserted into CouchDB
 */
/**
 * This method should handle any required conversion to create a document id from a tiddler title.
 * It should be static and have no side effects.
 * @function
 * @name DbDecorator#_mangleTitle
 * @param {String} title - Any tiddler title
 * @returns {String} title compatible with the destination database
 */
/**
 * Transforms a pouchd document extracting just the fields that should be
 * part of the tiddler discarding all the metadata related to PouchDB.
 * @function
 * @name DbDecorator#_convertFromCouch
 * @param {object} doc - A couchdb object containing a tiddler representation inside the fields sub-object
 * @returns {object} fields ready for being added to a wiki store
 */
