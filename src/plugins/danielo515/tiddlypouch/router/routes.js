/*\
title: $:/plugins/danielo515/tiddlypouch/database/routes
type: application/javascript
module-type: library

some routes for the DbRouter class

@preserve

\*/

'use strict'

/*jslint node: true, browser: true */

module.exports.plugins = {
    name: "plugins" ,
    route: function(tiddler){
        return '__TP_plugins';
    },
    canRoute: function(tiddler){
        return tiddler.isPlugin();
    }
}