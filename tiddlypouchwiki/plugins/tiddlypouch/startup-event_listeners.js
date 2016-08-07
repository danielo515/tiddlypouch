/*\
title: $:/plugins/danielo515/tiddlypouch/startup/event-listeners.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "TiddlyPouch-eventListeners";
exports.after = ["startup"];
exports.platforms = ["browser"];
exports.synchronous = true;

exports.startup = function(){
  var logger = new $tw.utils.Logger("TiddlyPouch");
  var uiConnector = require("$:/plugins/danielo515/tiddlypouch/ui/config.js");

  /*****************************************************************************
  ########################### EVENT LISTENERS ##################################*/
  $tw.rootWidget.addEventListener("tm-pouch-delete-db",function(event) {
      $tw.passwordPrompt.createPrompt({
    			serviceName: $tw.language.getString("TiddlyPouch/Delete-DB",{variables:{database:$tw.TiddlyPouch.config.currentDB.name}}),
    			noUserName: true,
    			submitText: "Confirm",
    			canCancel: true,
    			repeatPassword: false,
    			callback: function(data) {
    				if(data && data.password === 'delete') {
    					$tw.TiddlyPouch.database.destroy().then(
                function(){
                  logger.alert("Database ",$tw.TiddlyPouch.config.currentDB.name," deleted!!!")
                }
              );
    				}
    				return true; // Get rid of the password prompt
    			}
    		});
    });

	$tw.rootWidget.addEventListener("tm-TP-config-updateDebug",uiConnector.updateDebugHandler);

};

})();