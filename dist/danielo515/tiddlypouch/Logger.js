/*\
title: $:/plugins/danielo515/tiddlypouch/utils/logger.js
type: application/javascript
module-type: library
A basic logging implementation

@preserve

\*/
(function(){"use strict";var t=require("$:/core/modules/utils/logger.js").Logger;function e(e,o,r){t.call(this,e);if(typeof o==="object"){r=o.verbose;o=o.debug}this.isDebug=o;this.isVerbose=r}e.prototype=Object.create(t.prototype);e.prototype.constructor=t;e.prototype.debug=function(){if(!this.isDebug){return}this.log.apply(this,Array.prototype.slice.call(arguments,0))};e.prototype.trace=function(){if(!this.isVerbose){return}this.debug.apply(this,Array.prototype.slice.call(arguments,0))};exports.Logger=e})();