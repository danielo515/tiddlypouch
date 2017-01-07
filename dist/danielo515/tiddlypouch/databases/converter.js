/*\
title: $:/plugins/danielo515/tiddlypouch/converters/converter.js
type: application/javascript
module-type: library

Basic converter. Used by other decorators (AKA converters)

@preserve

\*/
"use strict";module.exports.decorate=Converter;function Converter(e){e._mangleTitle=function r(e){if(e.length==0){return e}var r=e.charAt(0);var t=e.substring(1);if(r==="_"){return"%5f"+t}else if(r==="%"){return"%25"+t}else{return e}};return e}