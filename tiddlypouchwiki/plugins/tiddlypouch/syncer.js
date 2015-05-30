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
  this.logger = new $tw.utils.Logger("PouchSync");
  var self=this;
  this.logger.log('Trying to sync...');
  function PouchLog(log,info){
    /*Appends info to the specified log tiddler*/
    var oldinfo = $tw.wiki.getTiddlerText(log) + '\n';
    var newinfo = typeof info === 'object' ? JSON.stringify(info,null,$tw.config.preferences.jsonSpaces) : info;
    var logTiddler = {type:'text/plain' , text: oldinfo + newinfo, title:log};
    $tw.wiki.addTiddler(new $tw.Tiddler(logTiddler));
    self.logger.log(info);
  }

    var URL = $tw.wiki.getTiddlerText(CONFIG_PREFIX + 'URL');
    var Databasename = $tw.wiki.getTiddlerText(CONFIG_PREFIX + 'RemoteDatabaseName');
    var sincStatusFlag = $tw.wiki.getTiddler(SYNC_ICON);
    /*If there is no URL set, then no sync*/
    if(!URL){
        this.logger.log("Entering offline mode");
        /* We don't want sync status icon on sidebar*/
        $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags:[]})); //so remove tags
        callback();
        return
    }
        /*Otherwise, add to sidebar with the tag (it could be removed) */
        $tw.wiki.addTiddler(new $tw.Tiddler(sincStatusFlag,{tags:['$:/tags/ControlPanel']})); //so remove tags
        
    URL = URL.substr(-1) === '/' ? URL.trim() : URL.trim() + '/'; //Make sure it ends with slash
    Databasename = Databasename.trim();
    var sync = $tw.TiddlyPouch.PouchDB.sync($tw.TiddlyPouch.database, URL+Databasename, {
        live: true,
        retry: true
    }).on('change', function (info) {
        self.logger.log(info)
        PouchLog(SYNC_LOG,info);
    }).on('paused', function () {
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'paused')
        PouchLog(SYNC_LOG,"===SYNC PAUSED===");
    }).on('active', function () {
        self.logger.log('replicate resumed (e.g. user went back online)');
        $tw.wiki.setText(SYNC_STATE,'text',undefined,'syncing');
        PouchLog(SYNC_LOG,"===SYNC ACTIVE===")
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
    callback();
};

})();