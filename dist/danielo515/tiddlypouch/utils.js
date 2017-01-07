/*\
title: $:/plugins/danielo515/tiddlypouch/utils
type: application/javascript
module-type: library

Collection of functions to help with some repetitive tasks.
It is different from the utils created at startup, which are tiddlypoucyh focused
This one should be required in order to be used.



@preserve

\*/
"use strict";var utils={boolToHuman:boolToHuman,plainToNestedObject:plainToNestedObject,flattenObject:flattenObject,saveAsJsonTiddler:saveAsJsonTiddler};module.exports=utils;function saveAsJsonTiddler(e,t,n){var o=n?$tw.config.preferences.jsonSpaces:null;$tw.wiki.addTiddler(new $tw.Tiddler({title:e,type:"application/json",text:JSON.stringify(t,null,o)}))}function flattenObject(e){var t={};var n;for(var o in e){if(!e.hasOwnProperty(o)){continue}if(typeof e[o]==="object"){n=flattenObject(e[o]);for(var i in n){if(!n.hasOwnProperty(i)){continue}t[o+(!!isNaN(i)?"."+i:"")]=n[i]}}else{t[o]=e[o]}}return t}function plainToNestedObject(e){var t={};$tw.utils.each(e,function(e,o){n(t,o.split("."),e)});return t;function n(e,t,n){t=t.slice();var o=t.pop();var i=t.reduce(function(e,t){e[t]=e[t]||{};return e[t]},e);i[o]=n;return e}}function boolToHuman(e){return e?"yes":"no"}