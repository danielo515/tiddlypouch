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

   var logger = new $tw.utils.Logger("PouchStartup");

    function buildDesignDocument(){
      /* This builds the design document.
         Each tiddler conforming the design document elements should be a  tiddler
         with just one anonimous function*/
       var design_document = $tw.wiki.getTiddlerData(CONFIG_PREFIX + "design_document"),
       /*To be valid json functions should be just one line of text. That's why we remove line breaks*/
           skinny_view = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "skinny-tiddlers-view").replace(/\r?\n/,' '),
           filter = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "design_document/filter").replace(/\r?\n/,' ');

       design_document.views['skinny-tiddlers'].map = skinny_view;
       design_document.filters.tiddlers = filter;
       return design_document;
   }

   function setDebug(){
       var debugActive = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "Debug/Active");
       var debugVerbose = $tw.wiki.getTiddlerText(CONFIG_PREFIX + "Debug/Verbose");

       $tw.TiddlyPouch.Debug = {
                Active: debugActive === 'yes',
                Verbose: debugVerbose === 'yes'
       }
   }

   function getConfig(configName){
        var configValue = $tw.wiki.getTiddlerText(CONFIG_PREFIX + configName,"");
        return configValue.trim();
   };

   function getUrl(section){
       var URL = getConfig('URL');
       URL = URL.substr(-1) === '/' ? URL : URL + '/'; //Make sure it ends with slash
       if(section){
         URL += section;
       }
       return URL;
   };
  /* --- TiddlyPouch namespace creation and basic initialization---*/
  $tw.TiddlyPouch = { utils: {}};
  $tw.TiddlyPouch.utils.getConfig = getConfig;
  $tw.TiddlyPouch.utils.getUrl = getUrl;
  $tw.TiddlyPouch.databaseName = $tw.TiddlyPouch.utils.getConfig('DatabaseName');
  $tw.TiddlyPouch.designDocument = buildDesignDocument();
  setDebug();

  if(!$tw.TiddlyPouch.databaseName){
      /*If a database name is not set then don't create any database*/
      return
  }

  /* Here is where startup stuff really starts */

  $tw.TiddlyPouch.PouchDB = require("$:/plugins/danielo515/tiddlypouch/lib/pouchdb.js");
  $tw.TiddlyPouch.database = new $tw.TiddlyPouch.PouchDB($tw.TiddlyPouch.databaseName);
  logger.log("Client side pochdb started");
    if($tw.TiddlyPouch.Debug.Active){
      $tw.TiddlyPouch.database.on('error', function (err) { logger.log(err); });
     }

    $tw.TiddlyPouch.database.put($tw.TiddlyPouch.designDocument).then(function () {
      logger.log("PouchDB design document created");
    }).catch(function (err) {
        if(err.status == 409)
        logger.log("Design document exists already");
    });

    /*Fetch and add the StoryList before core tries to save it*/
    $tw.TiddlyPouch.database.get("$:/StoryList").then(function (doc) {
            $tw.wiki.addTiddler(new $tw.Tiddler(doc.fields,{title: doc._id, revision: doc._rev}));
            logger.log("StoryList is already in database ",doc.fields);
        }).catch(function (err) {
          logger.log("Error retrieving StoryList");
          logger.log(err);
        });

};

})();