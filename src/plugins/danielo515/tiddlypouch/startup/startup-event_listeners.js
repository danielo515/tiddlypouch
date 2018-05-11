/*\
title: $:/plugins/danielo515/tiddlypouch/startup/event-listeners.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
'use strict';

// Export name and synchronous status
exports.name = 'TiddlyPouch-eventListeners';
exports.after = [ 'startup' ];
exports.platforms = [ 'browser' ];
exports.synchronous = true;
const { DELETE_DB, LIST_REVISIONS, LOAD_REVISION, 
        CONFIG_SAVED, UPDATE_DEBUG, UPDATE_SELECTED_DB, 
        DB_HAS_BEEN_SELECTED 
      } = require('$:/plugins/danielo515/tiddlypouch/constants.js');

exports.startup = function () {
  var logger = new $TPouch.Logger('TiddlyPouch');
  var uiConnector = require('$:/plugins/danielo515/tiddlypouch/ui/config.js');
  var Utils = require('$:/plugins/danielo515/tiddlypouch/utils');

  /*****************************************************************************
  ########################### EVENT LISTENERS ##################################*/
  $tw.rootWidget.addEventListener(DELETE_DB, function (event) {
    $tw.passwordPrompt.createPrompt({
      serviceName: $tw.language.getString('TiddlyPouch/Delete-DB', { variables: { database: $TPouch.config.currentDB.name } }),
      noUserName: true,
      submitText: 'Confirm',
      canCancel: true,
      repeatPassword: false,
      callback: function (data) {
        if (data && data.password === 'delete') {
          $TPouch.database.destroy().then(
            function () {
              logger.alert('Database ', $TPouch.config.currentDB.name, ' deleted!!!');
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
  $tw.rootWidget.addEventListener(LIST_REVISIONS,
    function (event) {
      $TPouch.database.getTiddlerRevisions(event.param)
        .then(function (revisionsList) {
          var title = '$:/temp/revisions:' + event.param;
          Utils.saveAsJsonTiddler(title, revisionsList);
        });
    });
  /**
   * Loads certain revision of a tiddler under the revision namespace
   */
  $tw.rootWidget.addEventListener(LOAD_REVISION,
    function (event) {
      $TPouch.database.getTiddler(event.param, event.paramObject.revision)
        .then(function (tiddler) {
          tiddler.title = '$:/temp/revision:' + event.paramObject.revision.slice(0, 6) + ':' + event.param;
          $tw.wiki.addTiddler(tiddler);
        });
    });

  /** ================ CONFIG RELATED ================ */
  $tw.rootWidget.addEventListener(CONFIG_SAVED, function () {
    var reload = confirm('Configuration has been changed and saved. It is necessary to reload the window. Are you Ok with it?');
    reload && location.reload();
  });

  $tw.rootWidget.addEventListener('tp-sync-state', uiConnector.setSyncFlag);
  $tw.rootWidget.addEventListener(DB_HAS_BEEN_SELECTED, uiConnector.handlers.databaseHasBeenSelected);
  $tw.rootWidget.addEventListener(UPDATE_DEBUG, uiConnector.handlers.updateDebug);
  $tw.rootWidget.addEventListener(UPDATE_SELECTED_DB, uiConnector.handlers.updateDbConfig);

};
