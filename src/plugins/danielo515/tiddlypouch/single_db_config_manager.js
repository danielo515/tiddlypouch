/*\
title: $:/plugins/danielo515/tiddlypouch/config/single-db-config
type: application/javascript
module-type: library


@preserve

\*/

/*jslint node: true, browser: true */
/*global module: false */

/*** Exports **********************************/
module.exports = dbConfig;

/***************************** CODE ********************************/

/**
 * 
 * @constructor
 * @param {String|Object} name  The name of the database. This can also be a complete config
 *                               for the new database;
 * @param {Object} remote
 */
function dbConfig(name, remote) {
    if( typeof name === 'object' ){
        remote = name.remote;
        name = name.name;
    }
    this.name = name;
    this.remote = {};
    if (typeof remote === 'object') {
        /** We only copy valid values, not the full object */
        this.remote.name = remote.name;
        this.remote.url = remote.url;
        this.remote.username = remote.username;
    }
}

dbConfig.prototype.getName = function () {
    return this.name;
}

dbConfig.prototype.getRemoteName = function() {
    var name = this.remote && this.remote.name;
    return name;
}

dbConfig.prototype.getConfig = function () {
    return {
        name: this.name,
        remote: this.remote
    }
}

dbConfig.prototype.getUrl = function getUrl(section) {
    var URL = this.remote.url;
    if (!URL) { return null }
    URL = URL.substr(-1) === '/' ? URL : URL + '/'; //Make sure it ends with slash
    if (section) {
        URL += section;
    }
    return URL;

}

