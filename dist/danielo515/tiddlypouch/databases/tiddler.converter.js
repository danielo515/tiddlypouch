/*\
title: $:/plugins/danielo515/tiddlypouch/converters/tiddler
type: application/javascript
module-type: library

a conversor that makes tiddlers compatible with pouchdb. This injects the required methods into the db store to handle conversions between regular tiddlers and couchdb

@preserve

\*/
"use strict";module.exports.decorate=tiddlerConverter;var BaseConverter=require("$:/plugins/danielo515/tiddlypouch/converters/converter.js");function tiddlerConverter(e){e=BaseConverter.decorate(e);e._convertToCouch=function t(e,i){var r={fields:{}};if(e){$tw.utils.each(e.fields,function(t,i,n){if(i==="revision"){return}if(i==="_attachments"&&!e.isDraft()){r._attachments=t;return}r.fields[i]=e.getFieldString(i)});r.fields.tags=e.fields.tags}r.fields.type=r.fields.type||"text/vnd.tiddlywiki";r._id=this._mangleTitle(e.fields.title);r._rev=e.fields.revision;if(i.adaptorInfo&&i.adaptorInfo._rev){r._rev=i.adaptorInfo._rev}r._rev=this._validateRevision(r._rev);return r};e._convertFromCouch=function i(e){var t={};this.logger&&this.logger.debug("Converting from ",e);$tw.utils.each(e,function(i,r,n){if(r==="fields"){$tw.utils.each(i,function(e,i,r){t[i]=e})}else if(r==="_id"||r==="_rev"){}else{t[r]=e[r]}});t["revision"]=e["_rev"];return t};e.getSkinnyTiddlers=function(){return this.getTiddlers("skinny_tiddlers",null,false)};return e}