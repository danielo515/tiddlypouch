/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouchdb-sycer.js
type: application/javascript
module-type: startup

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "pouchdb-sycer";
exports.after = ["pouchdb"];
exports.platforms = ["browser"];
exports.synchronous = false;

var CONFIG_PREFIX="$:/plugins/danielo515/tiddlypouch/config/";
var SYNC_STATE="$:/state/tiddlypouch/sync/status"
var SYNC_ERRORS="$:/state/tiddlypouch/sync/errors"
var SYNC_LOG="$:/state/tiddlypouch/sync/Log"
var SYNC_ICON="$:/state/tiddlypouch/sync/status"

exports.startup = function(callback) {
   /* --- Declaration ZONE ---*/
   /*============================*/
  this.logger = new $tw.utils.Logger("PouchSync");
  var self=this;
  this.logger.log('Trying to sync...');
 
 function PouchLog(log,info){
    if($tw.TiddlyPouch.Debug.Active){
        /*Appends info to the specified log tiddler*/
        var oldinfo = $tw.wiki.getTiddlerText(log) + '\n';
        var newinfo = typeof info === 'object' ? JSON.stringify(info,null,$tw.config.preferences.jsonSpaces) : info;
        var logTiddler = {type:'text/plain' , text: oldinfo + newinfo, title:log};
        $tw.wiki.addTiddler(new $tw.Tiddler(logTiddler));
    }
    self.logger.log(info);
  }
  
  function startSync(remoteDB){
      /*To-do: Should check if local db exists and if there is another sync going*/
      var sync = $tw.TiddlyPouch.PouchDB.sync($tw.TiddlyPouch.database, remoteDB, {
        live: true,
        retry: true
    }).on('change', function (info) {
        PouchLog(SYNC_LOG,info);
    }).on('paused', function () {
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'paused')
        PouchLog(SYNC_LOG,"===SYNC PAUSED===");
    }).on('active', function () {
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'syncing');
        PouchLog(SYNC_LOG,"===SYNC ACTIVE===");
        PouchLog(SYNC_LOG,"replicate resumed (e.g. user went back online)");
    }).on('denied', function (info) {
        // a document failed to replicate
        PouchLog(SYNC_ERRORS,info);
    }).on('complete', function (info) {
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'synced')
    }).on('error', function (err) {
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'error')
        PouchLog(SYNC_ERRORS,err);
    });
    $tw.TiddlyPouch.syncHandler=sync;
  }
  
  function newOnlineDB(){
      var utils = $tw.TiddlyPouch.utils;
      var URL = utils.getConfig('URL');
      var Databasename = utils.getConfig('RemoteDatabaseName');
      var sincStatusFlag = $tw.wiki.getTiddler(SYNC_ICON);
      /*If there is no URL set, then no sync*/
      if(!URL){
          PouchLog(SYNC_LOG,"Entering offline mode");
          /* We don't want sync status icon on sidebar*/
          $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags:[]})); //so remove tags
          return
       }
        /*Otherwise, add to sidebar with the tag (it could be removed) */
        $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags:['$:/tags/PageControls']}));
        
       URL = URL.substr(-1) === '/' ? URL : URL + '/'; //Make sure it ends with slash
       
       return $tw.TiddlyPouch.PouchDB(URL + Databasename);
  }
  
    $tw.TiddlyPouch.startSync = startSync;
    $tw.TiddlyPouch.newOnlineDB = newOnlineDB;
   /* Here is where startup stuff really starts */
    var onlineDB = newOnlineDB();
    if(!onlineDB){
        callback('There is no online DB set');
        return
    }
    startSync(onlineDB);
    callback();
};

})();