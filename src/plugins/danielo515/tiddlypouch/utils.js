/*\
title: $:/plugins/danielo515/tiddlypouch/utils
type: application/javascript
module-type: library

Collection of functions to help with some repetitive tasks.
It is different from the utils created at startup, which are tiddlypoucyh focused
This one should be required in order to be used.



@preserve

\*/

/*jslint node: false, browser: true */
/*global $tw: false */
"use strict";


/**
 * @namespace utils
 */

var utils =
    {
        boolToHuman: boolToHuman,
        plainToNestedObject: plainToNestedObject,
        flattenObject: flattenObject,
        saveAsJsonTiddler: saveAsJsonTiddler,
        convertFromCouch: convertFromCouch
    };

module.exports = utils;

function saveAsJsonTiddler(title, data, beautify) {
    var formatParameters = beautify ? $tw.config.preferences.jsonSpaces : null;
    $tw.wiki.addTiddler(new $tw.Tiddler({
        title: title,
        type: "application/json",
        text: JSON.stringify(data, null, formatParameters)
    }));
}

/* for this version just copy all fields across except _rev and _id */
function convertFromCouch(tiddlerFields) {
    var result = {};
    this.logger && this.logger.debug("Converting from ", tiddlerFields);
    // Transfer the fields, pulling down the `fields` hashmap
    $tw.utils.each(tiddlerFields, function (element, title, obj) {
        if (title === "fields") {
            $tw.utils.each(element, function (element, subTitle, obj) {
                result[subTitle] = element;
            });
        } else if (title === "_id" || title === "_rev") {
            /* skip these */
        } else {
            result[title] = tiddlerFields[title];
        }
    });
    result["revision"] = tiddlerFields["_rev"];
    //console.log("Conversion result ", result);
    return result;
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