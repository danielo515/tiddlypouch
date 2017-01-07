/*\
title: $:/plugins/danielo515/tiddlypouch/dbstore/factory
type: application/javascript
module-type: library

A factory of DbStores. This factory is responsible of instantiating the DbStores and inject them the required dependecies

@preserve

\*/
"use strict";module.exports=factory;var DbStore=require("$:/plugins/danielo515/tiddlypouch/DbStore.js");var converters={tiddlers:require("$:/plugins/danielo515/tiddlypouch/converters/tiddler"),plugins:require("$:/plugins/danielo515/tiddlypouch/converters/plugins")};function factory(r,e,t){e=e||"tiddlers";var i=converters[e];var o=new DbStore(r,t);return i.decorate(o)}