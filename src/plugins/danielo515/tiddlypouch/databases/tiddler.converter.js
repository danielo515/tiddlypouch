/*\
title: $:/plugins/danielo515/tiddlypouch/converters/tiddler
type: application/javascript
module-type: library

a conversor that makes tiddlers compatible with pouchdb. This injects the required methods into the db store to handle conversions between regular tiddlers and couchdb

@preserve

\*/

'use strict';

/*jslint node: true, browser: true */
/*global $tw: false */
/* global module */
/** @namespace {converters} tiddler.converter */

module.exports.decorate = tiddlerConverter;

/***====================== Tiddler conversor dependency  ========================== */
var BaseConverter = require('$:/plugins/danielo515/tiddlypouch/converters/converter.js');

/**
 * Injects methods to handle conversions between regular TW tiddlers and CouchDB
 *
 * @param {DbStore} db a database instance where methods should be injected
 * @return {DbStore} The same db with the methods already injected
 */
function tiddlerConverter(db) {
    /***===================== CONVERSIONS BETWEEN TW AND PouchDB ============= */

    db = BaseConverter.decorate(db);

    /**
     * Copy all fields to "fields" sub-object except for the "revision" field.
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
    db._convertToCouch = function convertToCouch(tiddler, {adaptorInfo} = {}) {
        var result = { fields: {} };
        if (tiddler) {
            $tw.utils.each(tiddler.fields, function (element, title/* , object */) {
                if (title === 'revision') {
                    /* do not store revision as a field */
                    return;
                }
                if (title === '_attachments' && !tiddler.isDraft()) {
                    //Since the draft and the original tiddler are not the same document
                    //the draft does not has the attachments
                    result._attachments = element; //attachments should be stored out of fields object
                    return;
                }
                // Convert fields to string
                result.fields[title] = tiddler.getFieldString(title);
            });
            // tags must stay as array, so fix it
            result.fields.tags = tiddler.fields.tags;
        }
        // Default the content type
        result.fields.type = result.fields.type || 'text/vnd.tiddlywiki';
        result._id = this._mangleTitle(tiddler.fields.title);
        if (adaptorInfo && adaptorInfo._rev && this._validateRevision(adaptorInfo._rev)) {
            result._rev = adaptorInfo._rev;
        }
        return result;
    };

        /**
         * Transforms a pouchd document extracting just the fields that should be
         * part of the tiddler discarding all the metadata related to PouchDB.
         * For this version just copy all fields across except _rev and _id
         * @static
         * @param {object} doc - A couchdb object containing a tiddler representation inside the fields sub-object
         * @returns {object} fields ready for being added to a wiki store
         */
    db._convertFromCouch = function convertFromCouch(doc) {
        var result = {};
        this.logger && this.logger.debug('Converting from ', doc);
            // Transfer the fields, pulling down the `fields` hashmap
        $tw.utils.each(doc, function (element, field/* , obj */) {
                if (field === 'fields') {
                    $tw.utils.each(element, function (element, subTitle/* , obj */) {
                        result[subTitle] = element;
                    });
                } else if (field === '_id' || field === '_rev') {
                    /* skip these */
                } else {
                    result[field] = doc[field];
                }
            });
            /* If the doc has a revision field use it.
              Sometimes the revision field does not exists, for example, some indexes do not emit it, like the skinny_tiddlers index
              This fixes #66*/
        doc._rev && (result.revision = doc._rev);
            //console.log("Conversion result ", result);
        return result;
    };

/**
 * Returns an array of skinny tiddlers (tiddlers withouth text field)
 * They are converted from CouchDB documents to TW tiddlers.
 * It requires that a skinny_tiddlers view exists on the database.
 * Such index is created on the startup module startup-pouch, wich is probably a bad practice
 * @return {promise} Skinnytiddlers a promise that fulfills to an array of skinny tiddlers
 */
    db.getSkinnyTiddlers = function () {
        return this.getTiddlers('skinny_tiddlers',null,false);
    };

    return db;
}
