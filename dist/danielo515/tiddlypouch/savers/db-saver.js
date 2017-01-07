/*\
title: $:/plugins/danielo515/tiddlypouch/savers/DownloadCurrentDB
type: application/javascript
module-type: saver

Saves all the tiddlers on the current database as JSON

@preserve 

\*/
(function(){"use strict";var e=require("$:/plugins/danielo515/tiddlypouch/utils");function n(e){this.downloader=require("$:/core/modules/savers/download.js").create(e)}n.prototype.save=function(e,n,o){var r={variables:{filename:$TPouch.config.currentDB.getName()+".json"}};var t=[];var a=this;Promise.all([$TPouch.database._db.allDocs({include_docs:true,endkey:"_design"}),$TPouch.database._db.allDocs({include_docs:true,startkey:"_design￿"})]).then(function(e){return e[0].rows.concat(e[1].rows)}).then(function(e){e.forEach(function(e){t.push($TPouch.database._convertFromCouch(e.doc))});var c=JSON.stringify(t,null,$tw.config.preferences.jsonSpaces);a.downloader.save(c,n,o,r)});return true};n.prototype.info={name:"Download current db",priority:100,capabilities:["save","download"]};exports.canSave=function(e){return $TPouch.database!==undefined};exports.create=function(e){return new n(e)}})();