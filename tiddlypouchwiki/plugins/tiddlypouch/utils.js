/*\
title: $:/plugins/danielo515/tiddlypouch/startup/utils.js
type: application/javascript
module-type: startup

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "pouchdb-utils";
exports.after = ["pouchdb"];
exports.before = ["pouchdb-sycer"];
exports.platforms = ["browser"];
exports.synchronous = false;

exports.startup = function() {
  this.logger = new $tw.utils.Logger("PouchDB");
  var self = this;
   var utils = {};
   utils.remove = function(title){
     var db=$tw.TiddlyPouch.database;
     db.get(title).then(
       function(doc) {
            return db.remove(doc);
          }).then(function (result) {
            self.logger.log("Document removed",doc);
          }).catch(function (err) {
            self.logger.log(err);
          });
   }


   $tw.TiddlyPouch.utils = utils;

};

})();