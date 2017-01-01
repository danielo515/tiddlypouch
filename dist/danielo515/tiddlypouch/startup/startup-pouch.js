/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouch.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/
(function(){"use strict";exports.name="pouchdb";exports.before=["startup"];exports.platforms=["browser"];exports.synchronous=false;exports.startup=function(e){var t=new $TPouch.Logger("PouchStartup");var i=require("$:/plugins/danielo515/tiddlypouch/database/router.js");var o=require("$:/plugins/danielo515/tiddlypouch/database/routes");$TPouch._db=$TPouch._db||new PouchDB($TPouch.config.currentDB.name);$TPouch.database=$TPouch.DbStore($TPouch.config.currentDB.name,"tiddlers",$TPouch._db);$TPouch.plugins=$TPouch.DbStore("__TP_plugins","plugins",$TPouch._db);$TPouch.router=i.createRouter($TPouch.database);$TPouch.router.addRoute(o.plugins).addDestination("__TP_plugins",$TPouch.plugins);t.log("Client side dbs created");if($TPouch.config.debug.isActive()){$TPouch.database._db.on("error",function(e){t.log(e)})}Promise.all([$TPouch.database.createIndex("by_type",function(e){e.fields.type&&emit(e.fields.type)}),$TPouch.database.createIndex("skinny_tiddlers",function(e){if(e.fields["plugin-type"]){return}var t={};for(var i in e.fields){if(["text"].indexOf(i)===-1){t[i]=e.fields[i]}}t.revision=e._rev;emit(e._id,t)}),$TPouch.plugins.createIndex("by_plugin_type",function(e){e.fields&&e.fields["plugin-type"]&&emit(e.fields["plugin-type"])})]).catch(function(e){t.log("Something went wrong during index creation",e)}).then(function(){return $TPouch.database.getTiddler("$:/StoryList")}).then(function(e){$tw.wiki.addTiddler(e);t.debug("StoryList was already in database ",e);return $TPouch.database.getTiddler("$:/DefaultTiddlers")}).then(function(e){$tw.wiki.addTiddler(e);t.log("Default tiddlers loaded from database ",e)}).catch(function(e){t.log("Error retrieving StoryList or DefaultTiddlers");t.debug(e)}).then(function(){t.log("Client side dbs initialized");e()})}})();