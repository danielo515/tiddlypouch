/*\
title: $:/plugins/danielo515/tiddlypouch/savers/DownloadCurrentDB
type: application/javascript
module-type: saver

Saves all the tiddlers on the current database as JSON

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false, Promise */
'use strict';

var Utils = require('@plugin/utils');
const saveStartNotification = '$:/language/TiddlyPouch/Notifications/Save/Starting';

/**
 * @constructor {type} DownloadCurrentDB
*  Select the appropriate saver module and set it up
*/
function DownloadCurrentDB(wiki) {
  this.wiki = wiki;
}

DownloadCurrentDB.prototype.save = function (text, method, callback, options ) {

  if ($tw.syncer.isDirty()){
    // If the syncer has not finished her job, we display a message and defer the save for one second...
    $tw.notifier.display(saveStartNotification);
    window.setTimeout($tw.rootWidget.dispatchEvent.bind($tw.rootWidget),1000, {type: 'tm-save-wiki'});
    /**Stop other savers from trying to download the wiki */
    return true;
  }
  // if the syncer has finished then the wiki is ready to be downloaded, we return false so other module can handle the actual save.
  return false;
};


/**
* Information about this saver
*/
DownloadCurrentDB.prototype.info = {
  name: 'Download current db',
  priority: 100,
  capabilities: [ 'save' ]
};

/**
* Static method that returns true if this saver is capable of working
* @param {$tw.wiki} wiki wiki instance of the currently active tiddlywiki
*/
exports.canSave = function (wiki) {
  return $TPouch.database !== undefined;
};

/**
* Create an instance of this saver
*/
exports.create = function (wiki) {
  return new DownloadCurrentDB(wiki);
};
