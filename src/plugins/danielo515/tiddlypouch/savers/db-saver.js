/*\
title: $:/plugins/danielo515/tiddlypouch/savers/DownloadCurrentDB
type: application/javascript
module-type: saver

Saves all the tiddlers on the current database as JSON

@preserve 

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false, Promise */
    "use strict";

    var Utils = require('$:/plugins/danielo515/tiddlypouch/utils');

    /**
     * @constructor {type} DownloadCurrentDB
    *  Select the appropriate saver module and set it up
    */
    function DownloadCurrentDB(wiki) {
        this.downloader = require("$:/core/modules/savers/download.js").create(wiki);
    }

    DownloadCurrentDB.prototype.save = function (text, method, callback) {
        var options = {
            variables:
            {
                filename: $tw.TiddlyPouch.config.currentDB.getName() + '.json'
            }
        }
        var allTiddlers = [];
        var self = this;
        // There is no other way to get all the documents except the desig ones http://stackoverflow.com/a/25744823/1734815
        Promise.all([ /** get all documents except the design ones */
            $tw.TiddlyPouch.database.allDocs({include_docs: true, endkey: '_design'}),
            $tw.TiddlyPouch.database.allDocs({include_docs: true, startkey: '_design\uffff'})
            ])
            .then(function(allDocuments){
                return allDocuments[0].rows.concat(allDocuments[1].rows)
            }) 
            .then(function (allDocuments) {
                allDocuments.forEach(function (row) {
                    allTiddlers.push(Utils.convertFromCouch(row.doc))
                });
                var toDownload = JSON.stringify(allTiddlers, null, $tw.config.preferences.jsonSpaces);
                self.downloader.save(toDownload, method, callback, options)
            });
        /**Stop other savers from trying to download the wiki */
        return true
    };


    /**
    * Information about this saver
    */
    DownloadCurrentDB.prototype.info = {
        name: "Download current db",
        priority: 100,
        capabilities: ["save", "download"]
    };

    /**
    * Static method that returns true if this saver is capable of working
    */
    exports.canSave = function (wiki) {
        return $tw.TiddlyPouch.database !== undefined
    };

    /**
    * Create an instance of this saver
    */
    exports.create = function (wiki) {
        return new DownloadCurrentDB(wiki);
    };

})();