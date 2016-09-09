/*\
title: $:/plugins/danielo515/tiddlypouch/startup/event-listeners.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/

(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    // Export name and synchronous status
    exports.name = "TiddlyPouch-eventListeners";
    exports.after = ["startup"];
    exports.platforms = ["browser"];
    exports.synchronous = true;

    exports.startup = function () {
        var logger = new $tw.TiddlyPouch.Logger("TiddlyPouch");
        var uiConnector = require("$:/plugins/danielo515/tiddlypouch/ui/config.js");
        var Utils = require('$:/plugins/danielo515/tiddlypouch/utils');

        /*****************************************************************************
        ########################### EVENT LISTENERS ##################################*/
        $tw.rootWidget.addEventListener("tm-pouch-delete-db", function (event) {
            $tw.passwordPrompt.createPrompt({
                serviceName: $tw.language.getString("TiddlyPouch/Delete-DB", { variables: { database: $tw.TiddlyPouch.config.currentDB.name } }),
                noUserName: true,
                submitText: "Confirm",
                canCancel: true,
                repeatPassword: false,
                callback: function (data) {
                    if (data && data.password === 'delete') {
                        $tw.TiddlyPouch.database.destroy().then(
                            function () {
                                logger.alert("Database ", $tw.TiddlyPouch.config.currentDB.name, " deleted!!!")
                            }
                        );
                    }
                    return true; // Get rid of the password prompt
                }
            });
        });

        /**
         * Just asks for the revisions array and saves it as a JSON tiddler.
         */
        $tw.rootWidget.addEventListener("tm-tp-load-revisions",
            function (event) {
                $tw.syncadaptor.getRevisions(event.param)
                    .then(function (revisionsList) {
                        var title = "$:/temp/revisions:" + event.param
                        Utils.saveAsJsonTiddler(title, revisionsList);
                    });
            });
        /**
         * Loads certain revision of a tiddler under the revision namespace
         */
        $tw.rootWidget.addEventListener("tm-tp-load-certain-revision",
            function (event) {
                $tw.syncadaptor.loadRevision(event.param, event.paramObject.revision)
                    .then(function (tiddler) {
                        tiddler.title = "$:/temp/revision:" + event.paramObject.revision.slice(0,6) + ":" + event.param;
                        $tw.wiki.addTiddler(tiddler);  
                    });
            });

        /** ================ CONFIG RELATED ================ */
        $tw.rootWidget.addEventListener("tm-tp-config-saved", function () {
            var reload = confirm('Configuration has been changed and saved. It is necessary to reload the window. Are you Ok with it?');
            reload && location.reload();
        });

        $tw.rootWidget.addEventListener("tp-sync-state", uiConnector.setSyncFlag);
        $tw.rootWidget.addEventListener("tm-TP-config-selectedDb", uiConnector.handlers.databaseHasBeenSelected);
        $tw.rootWidget.addEventListener("tm-TP-config-updateDebug", uiConnector.handlers.updateDebug);
        $tw.rootWidget.addEventListener("tm-TP-config-updateSelectedDB", uiConnector.handlers.updateDbConfig);

    };

})();