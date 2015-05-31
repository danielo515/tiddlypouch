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

exports.startup = function(){
    /* --- Declaration ZONE ---*/
   //============================
    function buildDesignDocument(){
       var design_document = $tw.wiki.getTiddlerData(CONFIG_PREFIX + "design_document");
       var skinny_view = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "skinny-tiddlers-view").replace(/\n/,'');
       design_document.views['skinny-tiddlers'].map = skinny_view;
       return design_document;
   }
   
   function setDebug(){
       var debugActive = $tw.wiki.getTiddlerData(CONFIG_PREFIX + "Debug/Active");
       var debugVerbose = $tw.wiki.getTiddlerData(CONFIG_PREFIX + "Debug/Verbose");
       
       $tw.TiddlyPouch.Debug = { 
                Active: debugActive === 'yes',
                Verbose: debugVerbose === 'yes'
       }
   }
   
   function getConfig(configName){ 
        var configValue = $tw.wiki.getTiddlerText(CONFIG_PREFIX + configName,"");
        return configValue.trim();
   };
  /* --- TiddlyPouch namespace creation ---*/ 
  $tw.TiddlyPouch = { utils: {}};
  $tw.TiddlyPouch.utils.getConfig = getConfig;
  
  var utils = $tw.TiddlyPouch.utils;
  $tw.TiddlyPouch.databaseName = utils.getConfig('DatabaseName');
  if(!$tw.TiddlyPouch.databaseName){
      /*If a database name is not set then don't create any database*/
      return
  }
  
  /* Here is where startup stuff really starts */
  
  setDebug();
  
  $tw.TiddlyPouch.PouchDB = require("$:/plugins/danielo515/tiddlypouch/pouchdb.js");
  $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB($tw.TiddlyPouch.databaseName);
  console.log("Client side pochdb started");
    if($tw.TiddlyPouch.Debug.Active){
      $tw.TiddlyPouch.database.on('error', function (err) { console.log(err); });
     }

    $tw.TiddlyPouch.database.put(buildDesignDocument()).then(function () {
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