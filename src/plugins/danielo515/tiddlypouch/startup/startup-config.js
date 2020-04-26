/*\
title: $:/plugins/danielo515/tiddlypouch/startup/config.js
type: application/javascript
module-type: startup

Module responsible of managing the config.
Creates and reads the config database.
Provides an interface to the configurations (get, set, update)
Configuration should be immutable and require a reboot to become active
Only remote configuration (username, remote_name, url) may be changed in the running session.

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */

//@ts-check

/**
 * @typedef {Object} remoteConfig
 * @property {String} name The name of the remote database on the db server
 * @property {String} url The url of the database server (ej https://xxxx.cloudant.com)
 * @property {String} username An user with access rights to the remote database specified on name
 * @property {String} [ password ] The password of the provided username
 */

/**
 * @typedef {Object} databaseConfig
 * @property {String} name The name of the database
 * @property {remoteConfig} remote remote configurations
 */

/**
 * @typedef {Object} tpouchConfig
 * @property {String} selectedDbId The name of the currently selected database
 * @property {Object.<string,databaseConfig>} databases A map of the existing databases and its config
 * @property {Object} debug Current debug configuration
 * @property {Boolean} useFatTiddlers if the skinny tiddlers should be loaded with text field included
 */

'use strict';

// Export name and synchronous status
exports.name = 'TiddlyPouch-config';
exports.before = ['pouchdb'];
exports.platforms = ['browser'];
exports.synchronous = false;

var CONFIG_PREFIX = '$:/plugins/danielo515/tiddlypouch/config/';
var CONFIG_TIDDLER = CONFIG_PREFIX + 'config_database';


/**
 * @module config-startup
 */
exports.startup = function (callback) {

  const { extendDeep, extendOne } = require('@plugin/utils')
  var LOGGER = require('@plugin/utils/logger.js', true).Logger;
  var Logger = new LOGGER('TiddlyPouch:config');
  var Ui = require('@plugin/ui/config.js');
  var DbConfig = require('@plugin/config/single-db-config');
  /** @type {tpouchConfig} */
  var _config;
  var _configDB; // PouchDb where the _config is persisted to
  var currentDB; // name, remote { url, user } Only configs!, not the actual db
  const DEFAULT_NOTEBOOK_NAME = "MyNotebook"

  /**
   * @returns {tpouchConfig}
   */
  function getDefaultConfig() {
      return {
          debug: { active: true, verbose: false },
          selectedDbId: DEFAULT_NOTEBOOK_NAME,
          useFatTiddlers: false,
          databases: {},
      };
  }

  /*==== TIDDLER METHODS === */

  function _readConfigTiddler() {
    try {
      return JSON.parse($tw.wiki.getTiddler(CONFIG_TIDDLER).fields.text);
    } catch (error) {
      console.log('No tiddler config, using default');
      return getDefaultConfig();
    }
  }

  function _writeConfigTiddler(newConfig) {
    var config = newConfig || _config;
    var Jconfig = JSON.stringify(config);
    $tw.wiki.addTiddler(new $tw.Tiddler({ title: CONFIG_TIDDLER, type: 'application/json', text: Jconfig }));
    return newConfig;
  }

  /**
   * @function _updateConfig
   * The official method of saving configurations.
   * It accepts an object describing the new state of the configuration,
   * which can be a complete configuration object or just a subsection.
   * Configuration update is made by deep merging, so you can update sections of the configuration by providing
   * an object that only contains such sections, for example the specific configuration of one database.
   * @param  {Object} newConfig The new configuration to be persisted
   * @return {Promise} @fulfills to the config that has been saved to the database
   */
  function _updateConfig(newConfig) {
    // Extends existing config with the new one. Use empty object as base to avoid mutability
    var config = extendDeep({}, _config, newConfig);
    if (!config || !_isValidConfig(config)) {
      Logger.log('Updating config to DB - ERROR', 'Tried to persist an invalid config');
      return;
    }
    // After any update to the config persist the changes
    return _persistConfig(config)
      .then(updatedConfig => { // persist config returns the config just saved to the DB (important for revision)
        _config = updatedConfig;
        _writeConfigTiddler(updatedConfig);
        return updatedConfig
      });
  }

  /**
   * Removes the configuration of the provided database name
   * from the config store and persists it.
   * Make sure to call this method after deleting the database.
   * @param {String} dbName the database name to remove
   * @returns {Promise<tpouchConfig>} a promise that resolves when the new configuration
   * has been saved to the config database.
   */
  function removeDatabase(dbName) {
      const { [dbName]: _, ...databases } = _config.databases;
      const config = {
          ..._config,
          databases,
          selectedDbId: Object.keys(databases)[0] || DEFAULT_NOTEBOOK_NAME,
      };
      // After any update to the config persist the changes
      return _persistConfig(config).then((updatedConfig) => {
          // persist config returns the config just saved to the DB (important for revision)
          _config = updatedConfig;
          _writeConfigTiddler(updatedConfig);
          return updatedConfig;
      });
  }

  /*==== DATABASE METHODS === */
  /**
   * Saves the current configuration to the database
   *
   * @returns {Promise}
   * - Fullfills to the document written
   */
  function _persistConfig(newConfig) {
    var config = extendOne({ _id: 'configuration' }, newConfig);
    return _configDB.get('configuration')
      .catch(err => {
          if(err.status !== 404) throw err
          return getDefaultConfig()
      })
      .then( old => _configDB.put({...old, ...config}))
      .then((status) => {
        Logger.log('Persist config to DB - OK', status);
        return _readConfigFromDB();
      })
      .catch((err) => {
        Logger.log('Persist config to DB - ERROR', err);
        return config;
      });
  }

  /**
   * Reads the configuration from the _configDB
   * This method should be called from init() or after the database is instantiated
   *
   * @returns {Promise}
   * - Fullfills with the configuration object
   * - Rejects if no config exists or it is invalid
   */
  function _readConfigFromDB() {
    return _configDB
      .get('configuration')
      .then((config) => {
        if (_isValidConfig(config)) {
          return config;
        }
        throw new Error( "Config was read, but it was invalid" + JSON.stringify(config, null, 2)
        );
      })
      .catch((err) => {
        Logger.log('Config read from DB - ERROR', err);
        throw err;
      });
  }

  /*==== HELPER METHODS === */
  function _isValidConfig(config) {
    var valid = false;
    valid = !!(config && config.debug);
    valid = !!(config && config.selectedDbId);
    return valid;
  }

  /**
   * Reads the configuration of certain database from the config object.
   * Currently the _config holds also the databases configurations, but this may change on the future.
   *
   * If no configuration is found, returns a default config.
   *
   * @param {String} dbName name of the DB you want the config of
   * @returns {databaseConfig} databaseConfig
   */
  function _getDatabaseConfig(dbName) {
    var configDefault = {
      name: dbName,
      remote: { name: null, username: null, url: null }
    };

    _config.databases[dbName] = _config.databases[dbName] || configDefault;

    return _config.databases[dbName];
  }

  /*==== PUBLIC METHODS === */
  /**
   * Updates the remote config of the CURRENT database instance, and also it's associated configuration
   * inside the global databases configuration.
   * We update the current db instead of the selected one because this method is usually called after or before login,
   * so what makes sense is to login to the current database, not a potenitally saved one.
   * This is the only method that is allowed (for now) to modify the running config.
   * This method takes care of updating just the required sections, so make sure to pass to it JUST the remote section
   * @param {remoteConfig} remoteConf Just the remote section of a db config.
   * @returns {Promise} @fulfills when the config has been stored to the conf db.
   */

  function updateRemoteConfig(remoteConf) {
    currentDB.remote = $tw.utils.extend({}, currentDB.remote, remoteConf);
    return _updateConfig({
      databases: {
        [currentDB.getName()]: {
          remote: remoteConf
        }
      }
    });
  }

  /**
   * Fetches the names of the databases which configurations are saved
   *
   * @returns {Array} dbNames The names of all the databases configurations stored on the config
   */
  function getAllDBNames() {
    var dbNames = [];
    $tw.utils.each(_config.databases, function (db) {
      dbNames.push(db.name);
    });

    return dbNames;
  }

  function isDebugActive() {
    return _config.debug.active;
  }

  function isDebugVerbose() {
    return _config.debug.verbose;
  }

  /**
   * @returns {Boolean} if the use fat tiddlers option is active or not
   */
  function useFatTiddlers() {
      return _config.useFatTiddlers
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
  function init() {
    _configDB = $TPouch._configDb;
    Logger.log('Initializing config module');
    return _readConfigFromDB() // be aware of not breaking the promise chain!
      .then((config) => { // All ok reading from DB.
        Logger.debug('Config read from DB - OK');
        _config = config;
        return _writeConfigTiddler(config); // Save current config to tiddler
      })
      .catch((error) => { // Error reading from db, fallback to tiddler configuration
        Logger.debug('Error reading config from db: ', error);
        Logger.debug('FallingBack to tiddler configuration');
        _config = _readConfigTiddler();
        return _config; // return something to continue the chain!
      })
      .then((config) => {
        currentDB = new DbConfig(_getDatabaseConfig(_config.selectedDbId));
        return _updateConfig(config); //Persisted at the end of the chain because some functions may update with default values
      }
      );
  }

  return init().then(
    function () {
      /*==== PUBLIC API === */
      /* --- TiddlyPouch namespace creation and basic initialization---*/
      $TPouch.Logger = LOGGER;
      $TPouch.Logger.prototype.isDebugActive = _config.debug.active; // set logger defaults from what we read from DB
      $TPouch.DbStore = require('@plugin/dbstore/factory');
      // Config section of the global namespace
      $TPouch.config = {
        removeDatabase,
        getAllDBNames: getAllDBNames,
        readConfigTiddler: _readConfigTiddler,
        getDatabaseConfig: _getDatabaseConfig,
        update: _updateConfig,
        updateRemoteConfig: updateRemoteConfig,
        selectedDB: _config.selectedDbId,
        _configDB: _configDB,
        _getConfig: () => _config, // this is just to allow external code read this config, not tu use it at all
        debug: {
          isActive: isDebugActive,
          isVerbose: isDebugVerbose
        },
        useFatTiddlers,
        currentDB: currentDB
      };
      Ui.refreshUI(_config);
      Logger.log('Configuration startup finished', _config);
      callback();
    });

};

