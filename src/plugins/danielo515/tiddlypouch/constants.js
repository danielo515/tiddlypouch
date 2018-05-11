/*\
title: $:/plugins/danielo515/tiddlypouch/constants.js
type: application/javascript
module-type: library

Constants used across the entire plugin

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */

'use strict';

module.exports = {
// ===== EVENTS =====
  DELETE_DB: 'tm-pouch-delete-db',
  LIST_REVISIONS: 'tm-tp-load-revisions',
  LOAD_REVISION: 'tm-tp-load-certain-revision',
  CONFIG_SAVED:'tm-tp-config-saved',
  UPDATE_DEBUG: 'tm-TP-config-updateDebug',
  UPDATE_SELECTED_DB: 'tm-TP-config-updateSelectedDB',
  DB_HAS_BEEN_SELECTED: 'tm-TP-config-selectedDb'
};