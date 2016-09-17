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

/**====================== plugins conversor dependency  ========================== */
var BaseConverter = require('$:/plugins/danielo515/tiddlypouch/converters/converter.js')

/**
 * Injects methods to handle conversions between regular TW tiddlers and CouchDB.
 * getSkinnyTiddlers is not implemented because it does not makes sense on the plugins database
 *
 * @param {DbStore} db - a database instance where methods should be injected
 * @return {DbStore} The same db with the methods already injected
 */
function pluginConverter(db) {
    /**===================== CONVERSIONS BETWEEN TW AND PouchDB ============= */

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
    db._convertToCouch = function convertToCouch(tiddler, tiddlerInfo) {
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
        result._rev = tiddler.fields.revision; //Temporary workaround. Remove
        if (tiddlerInfo.adaptorInfo && tiddlerInfo.adaptorInfo._rev) {
            result._rev = tiddlerInfo.adaptorInfo._rev;
        }
        result._rev = this._validateRevision(result._rev);
        return result;
    };

        /** TODO: turn this into a dummy method. TW will never try to load a plugin from the sync adaptor.
         * We should also turn the loadTiddler into a dummy one that throws an error.
         * Even if TW tries to lazy-load a plugin (maybe because it was not injected on boot) the router will route that request to the default db
         *
         * Transforms a pouchd document extracting just the fields that should be
         * part of the tiddler discarding all the metadata related to PouchDB.
         * For this version just copy all fields across except _rev and _id
         * In the next implementation maybe remove the usedIn field, which indicates which wikis uses this plugin
         * @static
         * @param {object} doc - A couchdb object containing a tiddler representation inside the fields sub-object
         * @returns {object} fields ready for being added to a wiki store
         */
        db._convertFromCouch = function convertFromCouch(doc) {
            var result = {};
            this.logger && this.logger.debug("Converting from ", doc);
            // Transfer the fields, pulling down the `fields` hashmap
            $tw.utils.each(doc, function (element, field, obj) {
                if (field === "fields") {
                    $tw.utils.each(element, function (element, subTitle, obj) {
                        result[subTitle] = element;
                    });
                } else if (field === "_id" || field === "_rev") {
                    /* skip these */
                } else {
                    result[field] = doc[field];
                }
            });
            result["revision"] = doc["_rev"];
            //console.log("Conversion result ", result);
            return result;
        };

        return db;
}