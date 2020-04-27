/*\
title: $:/plugins/danielo515/tiddlypouch/constants.js
type: application/javascript
module-type: library

Constants used across the entire plugin.
This may feel trivial, but it is an big advantage:
 - one single place to see all the relevant tiddlers
 - one single place to update to change a tiddler name
 - other plugins/authors just use this constants and don't worry about keeping the names up-to-date

@preserve

\*/

/*jslint node: true, browser: true */

'use strict';

module.exports = {
    // ===== EVENTS =====
    DELETE_DB: 'tm-pouch-delete-db',
    LIST_REVISIONS: 'tm-tp-load-revisions',
    LOAD_REVISION: 'tm-tp-load-certain-revision',
    CONFIG_SAVED: 'tm-tp-config-saved',
    UPDATE_DEBUG: 'tm-TP-config-updateDebug',
    UPDATE_SELECTED_DB: 'tm-TP-config-updateSelectedDB',
    DB_HAS_BEEN_SELECTED: 'tm-TP-config-selectedDb',
    // ===== TIDDLERS =====
    SYNC_ICON: '$:/plugins/danielo515/tiddlypouch/ui/sync-flag',
    DATABASE_NAMES: '$:/plugins/danielo515/tiddlypouch/config/database_names',
    DEBUG_CONFIG: '$:/plugins/danielo515/tiddlypouch/ui/Config',
};
