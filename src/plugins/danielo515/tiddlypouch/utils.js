/*\
title: $:/plugins/danielo515/tiddlypouch/utils
type: application/javascript
module-type: library

Collection of functions to help with some repetitive tasks.
It is different from the utils created at startup, which are tiddlypoucyh focused
Utils here can be required for more granular use.

@preserve

\*/

/*jslint node: false, browser: true */
/*global $tw: false */
"use strict";


/**
 * @namespace utils
 */

const isObject = (o) => Object.prototype.toString.call(o) === '[object Object]';
// I am not writing a more general fn for performance reasons and because I don't need it!
const bothAreObjects = (x,y) => isObject(x) && isObject(y)
const extendOne = (target, src) => {
    for(const k in src){
        if(!src.hasOwnProperty(k)) continue; //avoid traversing prototype chain
        if(bothAreObjects(target[k], src[k])){
            extendOne(target[k],src[k]);
            continue
        }
        if(isObject(src[k])){ // if source is an object we need to clone it to avoid modifying it
            target[k] = extendOne({}, src[k]);
            continue
        }
        target[k] = src[k]
    }
    return target;
}

const extendDeep = (target, ...sources ) => {
    return sources.reduce(extendOne, target)
}



function saveAsJsonTiddler(title, data, beautify) {
    var formatParameters = beautify ? $tw.config.preferences.jsonSpaces : null;
    $tw.wiki.addTiddler(new $tw.Tiddler({
        title: title,
        type: "application/json",
        text: JSON.stringify(data, null, formatParameters)
    }));
}

// source: https://gist.github.com/gdibble/9e0f34f0bb8a9cf2be43
function flattenObject(ob) {
    var toReturn = {};
    var flatObject;
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) {
            continue;
        }
        if ((typeof ob[i]) === 'object') {
            flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) {
                    continue;
                }
                toReturn[i + (!!isNaN(x) ? '.' + x : '')] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

function plainToNestedObject(plain) {
    var result = {};
    $tw.utils.each(plain,
        function (value, key) {
            createChilds(result, key.split('.'), value)
        });
    return result;
    function createChilds(ob, keys, value) {
        keys = keys.slice(); // No side effects please
        var lastKey = keys.pop(); // Pop is handy but mutates the array
        var lastChild = keys.reduce(
            function (ob, k) {
                ob[k] = ob[k] || {};
                return ob[k];
            }
            , ob);
        lastChild[lastKey] = value;
        return ob;
    }
}

/**
 * Translates true/false to yes/no
 *
 * @param {Boolean} value value to convert
 * @returns {String} yes/no string
 */
function boolToHuman(value) {
    return value ? "yes" : "no"
}

// ===== EXPORTS =====


var utils =
    {
        boolToHuman: boolToHuman,
        plainToNestedObject: plainToNestedObject,
        flattenObject: flattenObject,
        saveAsJsonTiddler: saveAsJsonTiddler,
        extendOne,
        extendDeep,
        isObject
    };

module.exports = utils; // for regular imports. Below is the Browser namespaced export.

$TPouch.utils = extendOne($TPouch.utils || {}, utils); // we are using one of our functions to export our functions, wohooo