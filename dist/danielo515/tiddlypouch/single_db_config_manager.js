/*\
title: $:/plugins/danielo515/tiddlypouch/config/single-db-config
type: application/javascript
module-type: library


@preserve

\*/
module.exports=dbConfig;function dbConfig(e,t){if(typeof e==="object"){t=e.remote;e=e.name}this.name=e;this.remote={};if(typeof t==="object"){this.remote.name=t.name;this.remote.url=t.url;this.remote.username=t.username}}dbConfig.prototype.getName=function(){return this.name};dbConfig.prototype.getRemoteName=function(){var e=this.remote&&this.remote.name;return e};dbConfig.prototype.getConfig=function(){return{name:this.name,remote:this.remote}};dbConfig.prototype.getUrl=function e(t){var o=this.remote.url;if(!o){return null}o=o.substr(-1)==="/"?o:o+"/";if(t){o+=t}return o};