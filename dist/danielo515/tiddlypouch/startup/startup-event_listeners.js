/*\
title: $:/plugins/danielo515/tiddlypouch/startup/event-listeners.js
type: application/javascript
module-type: startup

This module creates the basic structure needed for the plugin.
This included the TiddlyPouch Object namespace and the local database
The existence of the database determines if the plugin will be active or not.

@preserve

\*/
(function(){"use strict";exports.name="TiddlyPouch-eventListeners";exports.after=["startup"];exports.platforms=["browser"];exports.synchronous=true;exports.startup=function(){var e=new $TPouch.Logger("TiddlyPouch");var t=require("$:/plugins/danielo515/tiddlypouch/ui/config.js");var a=require("$:/plugins/danielo515/tiddlypouch/utils");$tw.rootWidget.addEventListener("tm-pouch-delete-db",function(t){$tw.passwordPrompt.createPrompt({serviceName:$tw.language.getString("TiddlyPouch/Delete-DB",{variables:{database:$TPouch.config.currentDB.name}}),noUserName:true,submitText:"Confirm",canCancel:true,repeatPassword:false,callback:function(t){if(t&&t.password==="delete"){$TPouch.database.destroy().then(function(){e.alert("Database ",$TPouch.config.currentDB.name," deleted!!!")})}return true}})});$tw.rootWidget.addEventListener("tm-tp-load-revisions",function(e){$TPouch.database.getTiddlerRevisions(e.param).then(function(t){var n="$:/temp/revisions:"+e.param;a.saveAsJsonTiddler(n,t)})});$tw.rootWidget.addEventListener("tm-tp-load-certain-revision",function(e){$TPouch.database.getTiddler(e.param,e.paramObject.revision).then(function(t){t.title="$:/temp/revision:"+e.paramObject.revision.slice(0,6)+":"+e.param;$tw.wiki.addTiddler(t)})});$tw.rootWidget.addEventListener("tm-tp-config-saved",function(){var e=confirm("Configuration has been changed and saved. It is necessary to reload the window. Are you Ok with it?");e&&location.reload()});$tw.rootWidget.addEventListener("tp-sync-state",t.setSyncFlag);$tw.rootWidget.addEventListener("tm-TP-config-selectedDb",t.handlers.databaseHasBeenSelected);$tw.rootWidget.addEventListener("tm-TP-config-updateDebug",t.handlers.updateDebug);$tw.rootWidget.addEventListener("tm-TP-config-updateSelectedDB",t.handlers.updateDbConfig)}})();