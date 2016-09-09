/*\
title: $:/plugins/danielo515/tiddlypouch/startup/config.js
type: application/javascript
module-type: startup

Module responsible of managing the config.
Creates and reads the config database.
Provides an interface to the configurations (get, set, update)
Configuration should be inmutable and require a reboot to become active
Only remote configuration (username, remote_name, url) may be changed in the running session.

@preserve

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "TiddlyPouch-config";
exports.before = ["pouchdb"];
exports.platforms = ["browser"];
exports.synchronous = false;

var CONFIG_PREFIX = "$:/plugins/danielo515/tiddlypouch/config/";
var CONFIG_DATABASE = "__TP_config";
var CONFIG_TIDDLER = CONFIG_PREFIX + "config_database";


/**
 * @module config-startup
 */
exports.startup = function(callback){
    var LOGGER = require('$:/plugins/danielo515/tiddlypouch/utils/logger.js', true ).Logger;
    var Logger = new LOGGER("TiddlyPouch:config");
    var PouchDB = require("$:/plugins/danielo515/tiddlypouch/lib/pouchdb.js");
    var Ui = require("$:/plugins/danielo515/tiddlypouch/ui/config.js");
    var SingleConfig = require("$:/plugins/danielo515/tiddlypouch/config/single-db-config");
    var _config; // debug { active, verbose }, selectedDbId, databases
    var _configDB; // where the _config is persisted to 
    var currentDB; // name, remote { url, user } Only configs!, not the actual db

    /*==== TIDDLER METHODS === */

    function _readConfigTiddler(){
        var configDefault = {
            debug: {active: true, verbose: false },
            selectedDbId: 'MyNotebook',
            databases: {},
        };
        var config;
        try {
            config = JSON.parse($tw.wiki.getTiddler(CONFIG_TIDDLER).text);
        } catch (error) {
            console.log('No tiddler config, using default');
            config = configDefault;
        }
        return config;
    }

    function _writeConfigTiddler(newConfig){
        var config =  newConfig || _config;
        var Jconfig = JSON.stringify(config);
        $tw.wiki.addTiddler(new $tw.Tiddler({title: CONFIG_TIDDLER, type: "application/json", text: Jconfig}));
        return true;
    }

    function _updateConfig(newConfig){
        // Extends existing config with the new one. Use empty object as base to avoid mutability
        var config = $tw.utils.extend( {} , _config , newConfig );
        if (!config || !_isValidConfig(config)) {
            Logger.log('Updating config to DB - ERROR','Tried to persist an invalid config');
            return;
        }
        // After any update to the config persist the changes
        return _persistConfig(config)
        .then(_writeConfigTiddler)
        .then(function(){
            $tw.rootWidget && $tw.rootWidget.dispatchEvent({type:'tm-tp-config-saved' , param: true});
        });
    }

    /*==== DATABASE METHODS === */
    /**
     * Saves the current configuration to the database
     * 
     * @returns {Promise}
     * - Fullfills to the document written
     */
    function _persistConfig(newConfig){
        var config = $tw.utils.extend( {} , newConfig );
        config._id = config._id || 'configuration'; 
        return _configDB.put(config)
            .then(
                function(status){
                    Logger.log('Persist config to DB - OK',status);
                    return _readConfigFromDB();
                }
            )
            .catch(Logger.log.bind(Logger,'Persist config to DB - ERROR'));
    }

    /**
     * Reads the configuration from the _configDB
     * This method should be called from init() or after the database is instantiated
     *  
     * @returns {Promise}
     * - Fullfills with the configuration object
     * - Rejects if no config exists or it is invalid 
     */
    function _readConfigFromDB(){
        var promise = _configDB.get('configuration');
        promise = promise.then(function(config){
            if (_isValidConfig(config)) {
                return config;
            }
            throw new Error('Config was read, but it was invalid');
        });
        promise = promise.catch(
            function(err){
                Logger.log('Config read from DB - ERROR',err);
                throw err;
            });

        return promise;
    }

    /*==== HELPER METHODS === */
    function _isValidConfig(config){
        var valid = false;
        valid = !!( config && config.debug );
        valid = !!( config && config.selectedDbId );
        return valid;
    }

    /**
     * Reads the configuration of certain database from the config object.
     * Currently the _config holds also the databases configurations, but this may change on the future.
     * 
     * If no configuration is found, returns a default config.
     * 
     * @param {String} dbName name of the DB you want the config of
     * @returns {Object} databaseConfig  
     */
    function _getDatabaseConfig(dbName){
        var configDefault = {
            name: dbName,
            remote: {name: null, username: null, ur: null }
        }
        
        _config.databases[dbName] = _config.databases[dbName] || configDefault;
        
        return _config.databases[dbName];
    }

    /*==== PUBLIC METHODS === */
    /**
     * Updates the remote config of the current database.
     * This is the only method that is allowed to modify the running config
     * changes WILL NOT be persisted
     * 
     * @param {Object} newConfig Options that extends the current configuration
     
    function updateRemoteConfig(newConfig){
        currentDB.remote = $tw.utils.extend({}, currentDB.remote, newConfig); 
    }
    */

    /**
     * Fetches the names of the databases which configuratons are saved
     * 
     * @returns {Array} dbNames The names of all the databases configurations stored on the config
     */
    function getAllDBNames(){
        var dbNames = [];
        $tw.utils.each(_config.databases, function(db){
            dbNames.push(db.name);
        });

        return dbNames;
    }

    function isDebugActive(){
        return _config.debug.active;
    }

    function isDebugVerbose(){
        return _config.debug.verbose;
    }



    /**
     * Initializes the configuration internals.
     * - Creates the Pouch config db
     * - Reads from the config database
     * -- Load tiddler config if no config on db exists
     * --- Load default config if no tiddler config exists
     * - Updates the tiddler version of the config db
     * - Persists config read from tiddler to DB
     * 
     * @returns	{Promise} When fullfilled the configuration is ready to be used 
     */
    function init(){
        _configDB = new PouchDB(CONFIG_DATABASE);
        Logger.log('Initializing config module');
        return _readConfigFromDB() // be aware of not breaking the promise chain!
        .then(function(config){ // All ok reading from DB.
            Logger.debug("Config read from DB - OK");
            _config = config;
            _writeConfigTiddler(); // Save current config to tiddler version 
        })
        .catch( // Error reading from db, fallback to tiddler configuration 
            function(error){
                Logger.debug("FallingBack to tiddler configuration");
                _config = _readConfigTiddler();
                return _config; // return something to continue the chain!
            }
        ).then(
            function(){
                currentDB = new SingleConfig(_getDatabaseConfig(_config.selectedDbId));
                return _updateConfig(); //Persisted at the end of the chain because some functions may update with default values
            }
        );
    }

    return init().then(
        function(){
            /*==== PUBLIC API === */
            /* --- TiddlyPouch namespace creation and basic initialization---*/
            $tw.TiddlyPouch = {
                Logger: LOGGER,
                config: {
                    getAllDBNames: getAllDBNames,
                    readConfigTiddler: _readConfigTiddler,
                    getDatabaseConfig: _getDatabaseConfig,
                    update: _updateConfig,
                    selectedDB: _config.selectedDbId,
                     _configDB:  _configDB,
                     _config: _config,
                    debug: {
                        isActive: isDebugActive,
                        isVerbose: isDebugVerbose
                    },
                    currentDB: currentDB
            } };
            Ui.refreshUI(_config);
            Logger.log('Configuration startup finished',_config);
            callback();
        });

};

})();