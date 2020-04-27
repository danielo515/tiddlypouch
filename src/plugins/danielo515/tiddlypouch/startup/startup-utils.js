/*\
title: $:/plugins/danielo515/tiddlypouch/startup/utils.js
type: application/javascript
module-type: startup

Basic Utils object.

@preserve

\*/

/**@module */

/*jslint node: true, browser: true */
/*global $tw: false */
'use strict';

// Export name and synchronous status
exports.name = 'pouchdb-utils';
exports.after = [ 'pouchdb' ];
exports.before = [ 'pouchdb-syncer' ];
exports.platforms = [ 'browser' ];
exports.synchronous = true;

exports.startup = function () {
    this.logger = new $TPouch.Logger('PouchDB');
    var self = this;
    var db = $TPouch.database;

    $TPouch.utils = $TPouch.utils || {};
    /** Removes the document with the provided title from the database*/
    $TPouch.utils.remove = function (title) {
        db.get(title).then(
            function (doc) {
                return db.remove(doc);
            }).then(function (result) {
            self.logger.log('Document removed', result);
        }).catch(function (err) {
            self.logger.log(err);
        });
    };
    /** Replaces a document in the database with the provided one
    without taking in account the revision.*/
    $TPouch.utils.replace = function (newdoc) {
        db.get(newdoc._id).then(
            function (doc) {
                return db.remove(doc);
            }).then(function () {
            db.put(newdoc).then(function (doc) {
                self.logger.log('Document replaced', doc);
            });
        }).catch(function (err) {
            self.logger.log(err);
        });
    };

};
