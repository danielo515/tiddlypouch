/*\
title: $:/plugins/danielo515/tiddlypouch/converters/plugins
type: application/javascript
module-type: library

Decorator that convert tiddlywiki plugins into PouchDB documents

@preserve

\*/
"use strict";module.exports.decorate=pluginConverter;var BaseConverter=require("$:/plugins/danielo515/tiddlypouch/converters/converter.js");function pluginConverter(e){e=BaseConverter.decorate(e);e._convertToCouch=function t(e,r){var i={fields:{}};if(e){$tw.utils.each(e.fields,function(t,r){if(r==="revision"){return}i.fields[r]=e.getFieldString(r)});i.fields.tags=e.fields.tags}i.fields.type=i.fields.type||"text/vnd.tiddlywiki";i._id=this._mangleTitle(e.fields.title);i._rev=e.fields.revision;if(r.adaptorInfo&&r.adaptorInfo._rev){i._rev=r.adaptorInfo._rev}i._rev=this._validateRevision(i._rev);return i};e._convertFromCouch=function r(){var e=new Error("Tiddlers should not be loaded from the plugins database!");e.status=403;throw e};e.deleteTiddler=function(){var e=new Error("Tiddlers should not be deleted through the plugins database!");e.status=403;throw e};return e}