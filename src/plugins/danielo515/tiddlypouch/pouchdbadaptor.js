/*\
title: $:/plugins/danielo515/tiddlypouch/pouchadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with local PouchDB


@preserve

\*/


/*jslint node: false, browser: true */
/*global $tw: false, XMLHttpRequest: false */
'use strict';

/**
 * Creates the pouch sync adaptor
 * @constructor
 * @param {any} options
 */
function PouchAdaptor(options) {
  this.wiki = options.wiki;
  var Debug = $TPouch.config.debug;
  this.logger = new $TPouch.Logger('PouchAdaptor', Debug.isActive(), Debug.isVerbose() );
  this.sessionUrl = $TPouch.config.currentDB.getUrl('_session'); // save the URL on startup
    //this.readConfig()
}

/**
* Copied from TiddlyWiki5 core/modules/utils/dom/http.js to add support for xhr.withCredentials
* @argument {Object} options Options to be used on the request
* @argument {String} [options.type] Which verb to use (GET,POST,PUT,DELETE)
* @argument {Bool} [options.withCredentials] Use with credentials option on the request
* @argument {Object|String} [options.data] Data to be included as form data of the request
* @returns {Promise} resolves if the returned status is 200,201 or 204, reject otherwise
*/
function httpRequest(options) {
  var type = options.type || 'GET',
    headers = options.headers || { accept: 'application/json' },
    request = new XMLHttpRequest(),
    data = '',
    results;
    // Massage the data hashmap into a string
  if (options.data) {
    if (typeof options.data === 'string') { // Already a string
      data = options.data;
    } else { // A hashmap of strings
      results = [];
      $tw.utils.each(options.data, function (dataItem, dataItemTitle) {
        results.push(dataItemTitle + '=' + encodeURIComponent(dataItem));
      });
      data = results.join('&');
    }
  }
    // for CORS if required
  if (options.withCredentials) {
    request.withCredentials = true;
  }

  return new Promise((resolve,reject) => {

      // Set up the state change handler
    request.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status === 200 || this.status === 201 || this.status === 204) {
          // Success!
          return resolve(this.responseText);
        }
        // Something went wrong
        return reject('XMLHttpRequest error code: ' + this.status);
      }
    };
      // Make the request
    request.open(type, options.url, true);
    if (headers) {
      $tw.utils.each(headers, function (header, headerTitle) {
        request.setRequestHeader(headerTitle, header);
      });
    }
    if (data && !$tw.utils.hop(headers, 'Content-type')) {
      request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
    }
    request.send(data);
  });
}

/*****************************************************
 ****** Tiddlywiki required methods
 *****************************************************/

PouchAdaptor.prototype.getStatus = function (callback) {

  var self = this;

  if (!self.sessionUrl) {
    return callback(null, false, 'NON-AUTHENTICATED');
  }

  return httpRequest({
    url: self.sessionUrl,
    withCredentials: true
  })
  .then((data) => {

    var json = null;
    var isLoggedIn = false;
    var username = null;
    try {
      json = JSON.parse(data);
    } catch (e) {}
    if (json && json.userCtx) {
      username = json.userCtx.name;
      isLoggedIn = (username !== null);
      if (!isLoggedIn && json.userCtx.roles.length == 1 && json.userCtx.roles[0] === '_admin') {
                    // admin party mode
        self.logger.debug('Warning! Server is on admin party mode!');
        isLoggedIn = true;
      }
    }
    // If we are logged but there is no onlineDB means that there is a cookie
    // We have to create the database which will pick up the cookie.
    // TW will not call the login method if we are already logged in, even if the user clicks on login.
    if (isLoggedIn && !$TPouch.onlineDB) {
      $TPouch.onlineDB = $TPouch.newOnlineDB( );
      $TPouch.startSync($TPouch.onlineDB);
    }
    callback(null, isLoggedIn, username);
  })
  .catch( err => {
    self.logger.debug('Error during login phase',err);
    // In case of error, just flag us as non auth
    return callback(null, false, 'NON-AUTHENTICATED');
  });
};

PouchAdaptor.prototype.login = function (username, password, callback) {
  var self = this;
  const logger = this.logger;
  logger.log('About to log in...');

  return httpRequest({
    type: 'POST',
    url: self.sessionUrl,
    withCredentials: true,
    data: {name: username, password }
  })
  .then(() => {
    logger.log('Login succeed');
    callback();
  })
  .catch( err => {
    logger.log('Login failed', err);
    logger.alert('Login failed');
    callback(err);
  } );
};

PouchAdaptor.prototype.logout = function (callback) {
  var self = this;
  var options = {
    url: self.sessionUrl,
    type: 'DELETE',
    withCredentials: true,
  };

  return httpRequest(options)
  .then( () => callback() )
  .catch(callback);
};

PouchAdaptor.prototype.getTiddlerInfo = function (tiddler) {
  return { _rev: tiddler.fields.revision };
};

/**
 * Returns an array of skinny tiddlers (tiddlers withouth text field)
 * @param {function} callback callback to call with the converted tiddlers
 * @return {promise} Skinnytiddlers a promise that fulfills to an array of skinny tiddlers
 */
PouchAdaptor.prototype.getSkinnyTiddlers = function (callback) {
  $TPouch.database.getSkinnyTiddlers()
    .then(callback.bind(null,null))
    .catch(callback);
};

/**
 * Saves a tiddler to the current db store
 * @param  {Tiddler} tiddler - instance of $tw.Tiddler to be converted
 * @param  {function} callback - the callback that should be called when the operation completes
 * @param  {object} options - the options that the syncer provides, fo rexample tiddlerInfo metadata
 * @return {undefined} this does not returns anything
 */
PouchAdaptor.prototype.saveTiddler = function (tiddler, callback, options) {
  this.logger.trace('Tiddler info ',options.tiddlerInfo);
  $TPouch.router.route(tiddler,options).addTiddler(tiddler,options)
        .then(function (saveInfo) {
          callback(null, { _rev: saveInfo.rev }, saveInfo.rev);
        })
        .catch(callback);
};

PouchAdaptor.prototype.loadTiddler = function (title, callback) {
  $TPouch.database.getTiddler(title)
   .then( callback.bind(null,null)) // callback with null as error
   .catch( callback );
};

PouchAdaptor.prototype.deleteTiddler = function (title, callback, options) {
  if (!options.tiddlerInfo || !options.tiddlerInfo.adaptorInfo || typeof options.tiddlerInfo.adaptorInfo._rev == 'undefined') {
        /* not on server, just return OK */
    callback(null);
  }
  $TPouch.database.deleteTiddler(title)
    .then(callback.bind(callback,null))
    .catch(callback);
};

PouchAdaptor.prototype.isReady = function () {
    // Since pouchdb handles the sync to the server we declare ourselves allways ready.
  return true;
};

if ($tw.browser && $TPouch.database) {
    /*Only works if we are on browser and there is a database*/
  exports.adaptorClass = PouchAdaptor;
}
