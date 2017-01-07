/*\
title: $:/plugins/danielo515/tiddlypouch/database/router.js
type: application/javascript
module-type: library

Routes tiddlers between databases. What it actually does is return the destination database for a given tiddler.
It is the responsability of the entity that is requesting the routing to act on that destination.

@preserve

\*/
"use strict";module.exports=DbRouter;function defaultRouter(t){if(this.destinations.default){return"default"}throw new Error("There is no default route set!")}var defaultRoute={name:"default",canRoute:function(){return true},route:defaultRouter};function DbRouter(t){this.destinations={"default":t};this.routes=[defaultRoute]}DbRouter.createRouter=function(t){return new DbRouter(t)};DbRouter.prototype.addRoute=function(t){if(typeof t==="object"&&typeof t.canRoute==="function"&&typeof t.route==="function"){this.routes.push(t);return this}var e=new Error('Invalid route. Routes should include "canRoute" and "route" methods');throw e};DbRouter.prototype.addDestination=function(t,e){this.destinations[t]=e;return this};DbRouter.prototype.findRoute=function(t){for(var e=this.routes.length-1;e>-1;--e){var o=this.routes[e];if(o.canRoute.call(this,t)){return o}}};DbRouter.prototype.route=function(t){var e=this.findRoute(t);var o=e.route.call(this,t);return this.destinations[o]};