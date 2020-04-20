/*\
title: $:/plugins/danielo515/tiddlypouch/converters/plugins
type: application/javascript
module-type: library

Decorator that convert tiddlywiki plugins into PouchDB documents

@preserve

\*/

'use strict'

/*jslint node: true, browser: true */
/*global $tw: false */
/* global module */
/** @namespace {converters} plugins.converter */

module.exports.decorate = pluginConverter;

/***====================== plugins conversor dependency  ========================== */
var BaseConverter = require('$:/plugins/danielo515/tiddlypouch/converters/converter.js')

/**
 * Injects methods to handle conversions between regular TW tiddlers and CouchDB.
 * getSkinnyTiddlers is not implemented because it does not makes sense on the plugins database
 *
 * @param {DbStore} db - a database instance where methods should be injected
 * @return {DbStore} The same db with the methods already injected
 */
function pluginConverter(db) {
    /***===================== CONVERSIONS BETWEEN TW AND PouchDB ============= */

    /** decorate with the base methods */
    db = BaseConverter.decorate(db);

    /**
     * Copy all fields to "fields" except the "revision" field.
     * See also: TiddlyWebAdaptor.prototype.convertTiddlerToTiddlyWebFormat.
     *
     * @param {Tiddler} tiddler - the tiddler to convert to CouchDB format
     * @param {object} tiddlerInfo - The metadata about the tiddler that the sync mechanism of tiddlywiki provides.
     *                               This includes the revision and other metadata related to the tiddler that is not
     *                               included in the tiddler.
     * @static
     * @private
     * @returns {object} doc - An document object that represents the tiddler. Ready to be inserted into CouchDB
     */
    db._convertToCouch = function convertToCouch(tiddler,{adaptorInfo} ={}) {
        var result = { fields: {} };
        if (tiddler) {
            $tw.utils.each(tiddler.fields, function (element, field) {
                if (field === "revision") { return; } // Skip revision
                // Convert fields to string
                result.fields[field] = tiddler.getFieldString(field);
            });
            // tags must stay as array, so fix it
            result.fields.tags = tiddler.fields.tags;
        }
        // Default the content type
        result.fields.type = result.fields.type || "text/vnd.tiddlywiki";
        result._id = this._mangleTitle(tiddler.fields.title);
        if (adaptorInfo && adaptorInfo._rev) {
            result._rev = this._validateRevision(adaptorInfo._rev);
        }
        return result;
    };

        /**
         * Dummy method. TW should never try to load a plugin from the sync adaptor.
         * Even if TW tries to lazy-load a plugin (because any error handling the tiddler)
         * the router will route that request to the default DbStore
         * @return {null} nothing is returned
         */
        db._convertFromCouch = function convertFromCouch() {
            var err = new Error('Tiddlers should not be loaded from the plugins database!');
            err.status = 403;
            throw err
        };

        /**
         * Dummy method.
         * Tiddlers should never be deleted through the plugins DbStore
         * Even if TW tries to delete a plugin (because any error handling the tiddler)
         * the router will route that request to the default DbStore
         * @return {null} nothing is returned
         */
        db.deleteTiddler = function() {
            var err = new Error('Tiddlers should not be deleted through the plugins database!');
            err.status = 403;
            throw err
        };

        return db;
}
