/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouch.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "pouchdb";
exports.before = ["startup"];
exports.platforms = ["browser"];
exports.synchronous = true;

var CONFIG_PREFIX="$:/plugins/danielo515/tiddlypouch/config/";
var DEBUG=true;

var design_document = {
  '_id': '_design/tw',
  'views': {
    'skinny-tiddlers': {
      'map': function(doc){ var fields = {};           for(var field in doc.fields ){ if( ['text','title'].indexOf(field) === -1){ fields[field] = doc.fields[field]; }}           fields.revision = doc._rev;           emit(doc._id,fields); }.toString()
    }}
  };

exports.startup = function() {
  $tw.TiddlyPouch = {};
	$tw.TiddlyPouch.PouchDB = require("$:/plugins/danielo515/tiddlypouch/pouchdb.js");
  if($tw.node) {
        $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB('./tiddlywiki');
        console.log("Server side pouchdb started");
	}else{
        $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB('tiddlywiki');
        console.log("Client side pochdb started");
        if(DEBUG){
            $tw.TiddlyPouch.database.on('error', function (err) { console.log(err); });
        }
    }

    //var design_document = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "design_document");
    $tw.TiddlyPouch.database.put(design_document).then(function () {
        console.log("PouchDB design document created");
    }).catch(function (err) {
        if(err.status == 409)
            console.log("Design document exists already");
    });

    /*Fetch and add the StoryList before core tries to save it*/
    $tw.TiddlyPouch.database.get("$:/StoryList").then(function (doc) {
            $tw.wiki.addTiddler(new $tw.Tiddler(doc.fields,{title: doc._id, revision: doc._rev}));
            console.log("StoryList is already in database ",doc.fields);
        }).catch(function (err) {
            console.log("Error retrieving StoryList");
            console.log(err);
        });

};

})();