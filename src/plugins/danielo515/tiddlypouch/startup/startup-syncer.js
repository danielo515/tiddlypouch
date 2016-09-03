/*\
title: $:/plugins/danielo515/tiddlypouch/startup/pouchdb-sycer.js
type: application/javascript
module-type: startup


@preserve

\*/

(function() {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    // Export name and synchronous status
    exports.name = "pouchdb-sycer";
    exports.after = ["pouchdb"];
    exports.platforms = ["browser"];
    exports.synchronous = false;

    var SYNC_STATE = "$:/state/tiddlypouch/sync/status";
    var SYNC_ERRORS = "$:/state/tiddlypouch/sync/Log"; // for now, log everything to the same place
    var SYNC_LOG = "$:/state/tiddlypouch/sync/Log";

    exports.startup = function(callback) {
        /* --- Declaration ZONE ---*/
        /*============================*/
        var logger = new $tw.TiddlyPouch.Logger("PouchSync");

        function PouchLog(log, info, header) {
            if ($tw.TiddlyPouch.config.debug.isActive()) {
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
            return remoteDB.put($tw.TiddlyPouch.designDocument).then(start).catch(function (err) {
                if (err.status == 409) { // If we get a 409 the document exist on remote
                    start(); // So start sync anyway
                } else {
                    PouchLog(SYNC_ERRORS, err, "===SYNC Error starting===");
                    return err;
                }
            });
            function start(info) { //Function that actually starts the sync
                var sync = $tw.TiddlyPouch.PouchDB.sync($tw.TiddlyPouch.database, remoteDB, {
                    live: true,
                    retry: true,
                    filter: 'TiddlyPouch/tiddlers'
                }).on('change', function (info) {
                    PouchLog(SYNC_LOG, info, "===SYNC Change===");
                }).on('paused', function (err) {
                    $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'paused')
                    if (err)
                        PouchLog(SYNC_LOG, err, "===SYNC PAUSED===")
                    else
                        PouchLog(SYNC_LOG, "===SYNC PAUSED===");
                }).on('active', function () {
                    $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'syncing');
                    PouchLog(SYNC_LOG, "===SYNC ACTIVE===");
                    PouchLog(SYNC_LOG, "replicate resumed");
                }).on('denied', function (info) {
                    // a document failed to replicate
                    PouchLog(SYNC_ERRORS, info, "===SYNC Denied===");
                }).on('complete', function (info) {
                    $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'completed');
                    PouchLog(SYNC_LOG, info, "===SYNC Completed===");
                }).on('error', function (err) {
                    $tw.wiki.setText(SYNC_STATE, 'text', undefined, 'error')
                    PouchLog(SYNC_ERRORS, err, "===SYNC Error===");
                });
                $tw.TiddlyPouch.syncHandler = sync;
            }
        }

        function newOnlineDB(authOptions) {
            /* authOptions: {
              username: 'mysecretusername',
              password: 'mysecretpassword'
            }*/
            var Config = $tw.TiddlyPouch.config;
            var URL = Config.currentDB.getUrl();
            var Databasename = Config.currentDB.getRemoteName();
            /*If there is no URL set, then no sync*/
            if (!URL) {
                PouchLog(SYNC_LOG, "Entering offline mode");
                $tw.rootWidget.dispatchEvent({ type: "tp-sync-state", param: "offline" });
                return
            }
            $tw.rootWidget.dispatchEvent({ type: "tp-sync-state", param: "online" });

            return $tw.TiddlyPouch.PouchDB(URL + Databasename, { auth: authOptions });
        }

        /** Sync methos implantation */
        $tw.TiddlyPouch.startSync = startSync;
        $tw.TiddlyPouch.newOnlineDB = newOnlineDB;

    };

})();