/*\
title: $:/plugins/danielo515/tiddlypouch/startup/load-modules
type: application/javascript
module-type: startup

This module loads all the javascript tiddlers and stores them into the wiki store.
That way, the actual load-modules module of TW will have a chance to register them.
This includes javascript macros, deserializers, globals etc 

@preserve

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    /*global emit: false*/
    "use strict";

    // Export name and synchronous status
    exports.name = "load-modules-from-pouch";
    exports.before = ["load-modules"];
    exports.after = ["pouchdb"];
    exports.platforms = ["browser"];
    exports.synchronous = false;

    exports.startup = function (cb) {
        var Utils = require('$:/plugins/danielo515/tiddlypouch/utils');

        console.log('Registering javascript modules....');

         $tw.TiddlyPouch.database.query('by_type', {key: 'application/javascript', include_docs: true })
         .then(function(docs){
             docs.rows.forEach(function(row){
                 $tw.wiki.addTiddler(Utils.convertFromCouch(row.doc));
             });
             $tw.wiki.defineTiddlerModules();
             cb();
         }).catch(function(err){
             console.log('Stupid boy, you tried to use an index that does not exist!',err);
         });
    }

}());