/*\
title: $:/plugins/danielo515/tiddlypouch/startup/load-modules
type: application/javascript
module-type: startup

This module loads all the javascript tiddlers and stores them into the wiki store.
That way, the actual load-modules module of TW will have a chance to register them.
This includes javascript macros, deserializers, globals etc 

@preserve

\*/
(function(){"use strict";exports.name="load-modules-from-pouch";exports.before=["load-modules"];exports.after=["pouchdb"];exports.platforms=["browser"];exports.synchronous=false;exports.startup=function(o){var e=require("$:/plugins/danielo515/tiddlypouch/utils");console.log("Registering javascript modules....");$TPouch.database._db.query("by_type",{key:"application/javascript",include_docs:true}).then(function(e){e.rows.forEach(function(o){$tw.wiki.addTiddler($TPouch.database._convertFromCouch(o.doc))});$tw.wiki.defineTiddlerModules();o()}).catch(function(o){console.log("Stupid boy, you tried to use an index that does not exist!",o)})}})();