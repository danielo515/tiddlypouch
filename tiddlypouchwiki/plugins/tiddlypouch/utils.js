/*\
title: /plugins/danielo515/tiddlypouch/utils
type: application/javascript
module-type: library

Collection of functions to help with some repetitive tasks.
It is different from the utils created at startup, which are tiddlypoucyh focused
This one should be required in order to be used.


\*/
(function () {
    var utils = 
    {
        boolToHuman: boolToHuman,
        plainToNestedObject: plainToNestedObject,
        flattenObject: flattenObject
    };

    module.exports = utils;

    // source: https://gist.github.com/gdibble/9e0f34f0bb8a9cf2be43
    function flattenObject (ob) {
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
    };

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
     * @param {Boolean} value
     * @returns {String}
     */
    function boolToHuman(value) {
        return value ? "yes" : "no"
    }

} ());