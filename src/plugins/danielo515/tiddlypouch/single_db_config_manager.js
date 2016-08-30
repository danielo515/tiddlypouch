/*\
title: /plugins/danielo515/tiddlypouch/config/selected-db-config
type: application/javascript
module-type: library

\*/
(function() {

    function dbConfig(name , remote) {
        this.name = name;
        this.remote = {};
        if (typeof remote === 'object') {
            this.remote.name = remote.name;
            this.remote.url = remote.url;
            this.remote.username = remote.username;
        }
    }

    dbConfig.prototype.getName = function() {
        return this.name;
    }

    dbConfig.prototype.getConfig = function() {
        return {
            name: this.name,
            remote: this.remote
            }
    }

    dbConfig.prototype.getUrl = function getUrl() {
        var URL = this.remote.url;
        if (!URL) { return null };
        URL = URL.substr(-1) === '/' ? URL : URL + '/'; //Make sure it ends with slash
        if (section) {
            URL += section;
        }
        return URL;

    }

}())