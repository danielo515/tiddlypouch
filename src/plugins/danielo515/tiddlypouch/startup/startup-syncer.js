/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouchdb-syncer.js
type: application/javascript
module-type: startup


@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
'use strict';

// Export name and synchronous status
exports.name = 'pouchdb-syncer';
exports.after = [ 'pouchdb' ];
exports.platforms = [ 'browser' ];
exports.synchronous = true;

var SYNC_STATE = '$:/state/tiddlypouch/sync/status';
var SYNC_ERRORS = '$:/state/tiddlypouch/sync/Log'; // for now, log everything to the same place
var SYNC_LOG = '$:/state/tiddlypouch/sync/Log';

exports.startup = function () {
  /* --- Declaration ZONE ---*/
  /*============================*/
  var logger = new $TPouch.Logger('PouchSync');

  function PouchLog(log, info, header) {
    if ($TPouch.config.debug.isActive()) {
      /*Appends info to the specified log tiddler*/
      var oldinfo = $tw.wiki.getTiddlerText(log) + '\n';
      if (typeof info === 'object') {
        if (info.change && info.change.docs) {
          delete info.change.docs; //delete this horrible verbose thing
        }
        var newInfo = JSON.stringify(info, null, $tw.config.preferences.jsonSpaces);
      }
      else {
        var newInfo = info;
      }
      /* If provided we add the header to know what event called this logger
        if you try to add header in separate calls you may end with wrong order
        due to the asynchronous nature of the sync mechanism*/
      newInfo = header ? header + newInfo : newInfo;
      var logTiddler = { type: 'text/plain', text: oldinfo + newInfo, title: log };
      $tw.wiki.addTiddler(new $tw.Tiddler(logTiddler));
    }
    logger.log(info);
  }

  function startSync(remoteDB) {
    /*To-do: Should check if local db exists and if there is another sync going*/
    /*First make sure we have the correct design document on the remote database.
      This is mandatory for filtered replication. Filtered replication is necessary
      to avoid replicating unnecesary documents like design documents.*/
    return remoteDB.put(buildFilterView()).then(start).catch(function (err) {
      if (err.status == 409) { // If we get a 409 the document exist on remote
        start(); // So start sync anyway
      } else {
        PouchLog(SYNC_ERRORS, err, '===SYNC Error starting===');
        return err;
      }
    });
    function start(info) { //Function that actually starts the sync
      var sync = $TPouch.database._db.sync(remoteDB, {
        live: true,
        retry: true,
        filter: 'filtered_replication/only_tiddlers'
      }).on('change', function (info) {
        PouchLog(SYNC_LOG, info, '===SYNC Change===');
      }).on('paused', function (err) {
        $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'paused');
        if (err)
          PouchLog(SYNC_LOG, err, '===SYNC PAUSED===');
        else
          PouchLog(SYNC_LOG, '===SYNC PAUSED===');
      }).on('active', function () {
        $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'syncing');
        PouchLog(SYNC_LOG, '===SYNC ACTIVE===');
        PouchLog(SYNC_LOG, 'replicate resumed');
      }).on('denied', function (info) {
        // a document failed to replicate
        PouchLog(SYNC_ERRORS, info, '===SYNC Denied===');
      }).on('complete', function (info) {
        $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'completed');
        PouchLog(SYNC_LOG, info, '===SYNC Completed===');
      }).on('error', function (err) {
        $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'error');
        PouchLog(SYNC_ERRORS, err, '===SYNC Error===');
      });
      /* For filtered replication to work, we need the filter view both on the remote DB and the local DB
      * Please check https://pouchdb.com/2015/04/05/filtered-replication.html for more info
      */
      $TPouch.database._db
        .put(buildFilterView())
        .catch(function (err) {
          if (err.status !== 409) {
            PouchLog(SYNC_ERRORS, 'Filtered replication may not work, we were unable to store the required doc on the local DB', '===SYNC Error starting===');
          }
        });
      $TPouch.syncHandler = sync;
    }
  }

  function newOnlineDB(authOptions) {
    /* authOptions: {
      username: 'mysecretusername',
      password: 'mysecretpassword'
    }*/
    var Config = $TPouch.config;
    var URL = Config.currentDB.getUrl();
    var Databasename = Config.currentDB.getRemoteName();
    /*If there is no URL set, then no sync*/
    if (!URL) {
      PouchLog(SYNC_LOG, 'Entering offline mode');
      $tw.rootWidget.dispatchEvent({ type: 'tp-sync-state', param: 'offline' });
      return;
    }
    $tw.rootWidget.dispatchEvent({ type: 'tp-sync-state', param: 'online' });

    return new PouchDB(URL + Databasename, { auth: authOptions });
  }

  function buildFilterView() {
    return {
      '_id': '_design/filtered_replication',
      'filters': {
        'only_tiddlers': function (doc) {
          return doc.hasOwnProperty('fields');
        }.toString()
      }
    };
  };

  /** Sync methos implantation */
  $TPouch.startSync = startSync;
  $TPouch.newOnlineDB = newOnlineDB;

};

