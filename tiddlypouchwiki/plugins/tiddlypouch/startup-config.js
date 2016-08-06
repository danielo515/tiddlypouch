/*\
title: $:/plugins/danielo515/tiddlypouch/startup/config.js
type: application/javascript
module-type: startup

Module responsible of managing the config.
Creates and reads the config database.
Provides an interface to the configurations (get, set, update)
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "TiddlyPouch-config";
exports.after = ["startup"];
exports.before = ["pouchdb"];
exports.platforms = ["browser"];
exports.synchronous = true;

var CONFIG_PREFIX = "$:/plugins/danielo515/tiddlypouch/config/";
var CONFIG_DATABASE = "__TP_config";
var CONFIG_TIDDLER = CONFIG_PREFIX + "config_database";

exports.startup = function(){

	var Logger = new $tw.utils.Logger("TiddlyPouch:config");
	var PouchDB = require("$:/plugins/danielo515/tiddlypouch/lib/pouchdb.js")
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
		var config = $tw.wiki.getTiddlerData(CONFIG_TIDDLER,configDefault);
	}

	function _writeConfigTiddler(){
		var config = JSON.stringify(_config);
		$tw.wiki.addTiddler(new $tw.Tiddler({title: CONFIG_TIDDLER, type: "application/json", text: config}));
	}

	function _updateConfig(newConfig){}

	/*==== DATABASE METHODS === */
	/**
	 * Saves the current configuration to the database if it is a valid config
	 * 
	 * @returns void
	 */
	function _persistConfig(){
		if(!_config || ! _isValidConfig(_config)){
			Logger.log('Persist config to DB - ERROR','Tried to persist an invalid config')
			return;
		}
		_configDB.put(_config)
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
		promise.then(function(config){
			if(_isValidConfig(config)){
				return config;
			}
			throw new Error('Config was read, but it was invalid');
		});

		promise.catch(Logger.log.bind(Logger,'Config read from DB - ERROR'));

		return promise;
	}

	/*==== HELPER METHODS === */
	function _isValidConfig(config){
		var valid = false;
		valid = !!( config && config.debug );
		valid = !!( config && config.selectedDbId );
		return valid;
	}

	function _getDatabaseConfig(dbName){
		var configDefault = {
			name: dbName,
			remote: null
		}
		
		_config.databases[dbName] = _config.databases[dbName] || configDefault;
		
		return _config.databases[dbName];
	}
	/*==== PUBLIC METHODS === */
	function getRemoteUrl(){}
	function getAllDBNames(){}

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
		var readPromise = _readConfigFromDB();
		readPromise
		.then(function(config){ // All ok reading from DB.
			Logger.log("Config read from DB - OK");
			_config = config;
			_writeConfigTiddler(); // Save current config to tiddler version 
		})
		.catch( // Error reading from db, fallback to tiddler configuration 
			function(error){
				Logger.log("FallingBack to tiddler configuration");
				_config = _readConfigTiddler();
				_persistConfig(); // save the config to the DB
				return _config; // return something to continue the chain!
			}
		).then(
			function(){
				currentDB = _getDatabaseConfig(_config.selectedDbId);
			}
		);

		return readPromise;
	}


	

	return init().then(Logger.log.bind(Logger,'Configuration startup finished'));

};

})();