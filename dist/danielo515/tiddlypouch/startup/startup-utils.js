/*\
title: $:/plugins/danielo515/tiddlypouch/startup/utils.js
type: application/javascript
module-type: startup

Basic Utils object is created int the pouch startup module

@preserve

\*/
(function(){"use strict";exports.name="pouchdb-utils";exports.after=["pouchdb"];exports.before=["pouchdb-sycer"];exports.platforms=["browser"];exports.synchronous=true;exports.startup=function(){this.logger=new $TPouch.Logger("PouchDB");var o=this;var e=$TPouch.database;$TPouch.utils={};$TPouch.utils.remove=function(t){e.get(t).then(function(o){return e.remove(o)}).then(function(e){o.logger.log("Document removed",e)}).catch(function(e){o.logger.log(e)})};$TPouch.utils.replace=function(t){e.get(t._id).then(function(o){return e.remove(o)}).then(function(){e.put(t).then(function(e){o.logger.log("Document replaced",e)})}).catch(function(e){o.logger.log(e)})}}})();