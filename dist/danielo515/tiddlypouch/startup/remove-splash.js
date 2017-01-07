/*\
title: $:/plugins/danielo515/tiddlypouch/startup/remove-splash.js
type: application/javascript
module-type: startup

The only purpose of this startup module is removing the splash screen.
We do it on a startup module that is executed as later as possible on the
boot process, so we remove the loading message when the wiki has loaded fully,
and not before.

@preserve

\*/
"use strict";exports.name="TiddlyPouch-remove-splash";exports.after=["startup"];exports.platforms=["browser"];exports.synchronous=true;exports.startup=function(){$TPouch.splashScreen.hide()};