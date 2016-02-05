(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define(factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.angularValidation = factory();
    }
}(this, function () {
    //almond, and your modules will be inlined here
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("axa/amd/almond-custom", function(){});

(function () {
    //almond, and your modules will be inlined here
    /**
     * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
     * Available via the MIT or new BSD license.
     * see: http://github.com/jrburke/almond for details
     */
    //Going sloppy to avoid 'use strict' string cost, but strict practices should
    //be followed.
    /*jslint sloppy: true */
    /*global setTimeout: false */

    var requirejs, require, define;
    (function (undef) {
        var main,
            req,
            makeMap,
            handlers,
            defined = {},
            waiting = {},
            config = {},
            defining = {},
            hasOwn = Object.prototype.hasOwnProperty,
            aps = [].slice,
            jsSuffixRegExp = /\.js$/;

        function hasProp(obj, prop) {
            return hasOwn.call(obj, prop);
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @returns {String} normalized name
         */
        function normalize(name, baseName) {
            var nameParts,
                nameSegment,
                mapValue,
                foundMap,
                lastIndex,
                foundI,
                foundStarMap,
                starI,
                i,
                j,
                part,
                baseParts = baseName && baseName.split("/"),
                map = config.map,
                starMap = (map && map['*']) || {};

            //Adjust any relative paths.
            if (name && name.charAt(0) === ".") {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that "directory" and not name of the baseName's
                    //module. For instance, baseName of "one/two/three", maps to
                    //"one/two/three.js", but we want the directory, "one/two" for
                    //this normalization.
                    baseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split('/');
                    lastIndex = name.length - 1;

                    // Node .js allowance:
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                    }

                    name = baseParts.concat(name);

                    //start trimDots
                    for (i = 0; i < name.length; i += 1) {
                        part = name[i];
                        if (part === ".") {
                            name.splice(i, 1);
                            i -= 1;
                        } else if (part === "..") {
                            if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                                //End of the line. Keep at least one non-dot
                                //path segment at the front so it can be mapped
                                //correctly to disk. Otherwise, there is likely
                                //no path mapping for a path starting with '..'.
                                //This can still fail, but catches the most reasonable
                                //uses of ..
                                break;
                            } else if (i > 0) {
                                name.splice(i - 1, 2);
                                i -= 2;
                            }
                        }
                    }
                    //end trimDots

                    name = name.join("/");
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if ((baseParts || starMap) && map) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join("/");

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = map[baseParts.slice(0, j).join('/')];

                            //baseName segment has  config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = mapValue[nameSegment];
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && starMap[nameSegment]) {
                        foundStarMap = starMap[nameSegment];
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function makeRequire(relName, forceSync) {
            return function () {
                //A version of a require function that passes a moduleName
                //value for items that may need to
                //look up paths relative to the moduleName
                return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
            };
        }

        function makeNormalize(relName) {
            return function (name) {
                return normalize(name, relName);
            };
        }

        function makeLoad(depName) {
            return function (value) {
                defined[depName] = value;
            };
        }

        function callDep(name) {
            if (hasProp(waiting, name)) {
                var args = waiting[name];
                delete waiting[name];
                defining[name] = true;
                main.apply(undef, args);
            }

            if (!hasProp(defined, name) && !hasProp(defining, name)) {
                throw new Error('No ' + name);
            }
            return defined[name];
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Makes a name map, normalizing the name, and using a plugin
         * for normalization if necessary. Grabs a ref to plugin
         * too, as an optimization.
         */
        makeMap = function (name, relName) {
            var plugin,
                parts = splitPrefix(name),
                prefix = parts[0];

            name = parts[1];

            if (prefix) {
                prefix = normalize(prefix, relName);
                plugin = callDep(prefix);
            }

            //Normalize according
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relName));
                } else {
                    name = normalize(name, relName);
                }
            } else {
                name = normalize(name, relName);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];
                if (prefix) {
                    plugin = callDep(prefix);
                }
            }

            //Using ridiculous property names for space reasons
            return {
                f: prefix ? prefix + '!' + name : name, //fullName
                n: name,
                pr: prefix,
                p: plugin
            };
        };

        function makeConfig(name) {
            return function () {
                return (config && config.config && config.config[name]) || {};
            };
        }

        handlers = {
            require: function (name) {
                return makeRequire(name);
            },
            exports: function (name) {
                var e = defined[name];
                if (typeof e !== 'undefined') {
                    return e;
                } else {
                    return (defined[name] = {});
                }
            },
            module: function (name) {
                return {
                    id: name,
                    uri: '',
                    exports: defined[name],
                    config: makeConfig(name)
                };
            }
        };

        main = function (name, deps, callback, relName) {
            var cjsModule,
                depName,
                ret,
                map,
                i,
                args = [],
                callbackType = typeof callback,
                usingExports;

            //Use name if no relName
            relName = relName || name;

            //Call the callback to define the module, if necessary.
            if (callbackType === 'undefined' || callbackType === 'function') {
                //Pull out the defined dependencies and pass the ordered
                //values to the callback.
                //Default to [require, exports, module] if no deps
                deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
                for (i = 0; i < deps.length; i += 1) {
                    map = makeMap(deps[i], relName);
                    depName = map.f;

                    //Fast path CommonJS standard dependencies.
                    if (depName === "require") {
                        args[i] = handlers.require(name);
                    } else if (depName === "exports") {
                        //CommonJS module spec 1.1
                        args[i] = handlers.exports(name);
                        usingExports = true;
                    } else if (depName === "module") {
                        //CommonJS module spec 1.1
                        cjsModule = args[i] = handlers.module(name);
                    } else if (hasProp(defined, depName) ||
                        hasProp(waiting, depName) ||
                        hasProp(defining, depName)) {
                        args[i] = callDep(depName);
                    } else if (map.p) {
                        map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                        args[i] = defined[depName];
                    } else {
                        throw new Error(name + ' missing ' + depName);
                    }
                }

                ret = callback ? callback.apply(defined[name], args) : undefined;

                if (name) {
                    //If setting exports via "module" is in play,
                    //favor that over return value and exports. After that,
                    //favor a non-undefined return value over exports use.
                    if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                        defined[name] = cjsModule.exports;
                    } else if (ret !== undef || !usingExports) {
                        //Use the return value from the function.
                        defined[name] = ret;
                    }
                }
            } else if (name) {
                //May just be an object definition for the module. Only
                //worry about defining if have a module name.
                defined[name] = callback;
            }
        };

        requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
            if (typeof deps === "string") {
                if (handlers[deps]) {
                    //callback in this case is really relName
                    return handlers[deps](callback);
                }
                //Just return the module wanted. In this scenario, the
                //deps arg is the module name, and second arg (if passed)
                //is just the relName.
                //Normalize module name, if it contains . or ..
                return callDep(makeMap(deps, callback).f);
            } else if (!deps.splice) {
                //deps is a config object, not an array.
                config = deps;
                if (config.deps) {
                    req(config.deps, config.callback);
                }
                if (!callback) {
                    return;
                }

                if (callback.splice) {
                    //callback is an array, which means it is a dependency list.
                    //Adjust args if there are dependencies
                    deps = callback;
                    callback = relName;
                    relName = null;
                } else {
                    deps = undef;
                }
            }

            //Support require(['a'])
            callback = callback || function () {};

            //If relName is a function, it is an errback handler,
            //so remove it.
            if (typeof relName === 'function') {
                relName = forceSync;
                forceSync = alt;
            }

            //Simulate async callback;
            if (forceSync) {
                main(undef, deps, callback, relName);
            } else {
                //Using a non-zero value because of concern for what old browsers
                //do, and latest browsers "upgrade" to 4 if lower value is used:
                //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
                //If want a value immediately, use require('id') instead -- something
                //that works in almond on the global level, but not guaranteed and
                //unlikely to work in other AMD implementations.
                setTimeout(function () {
                    main(undef, deps, callback, relName);
                }, 4);
            }

            return req;
        };

        /**
         * Just drops the config on the floor, but returns req in case
         * the config return value is used.
         */
        req.config = function (cfg) {
            return req(cfg);
        };

        /**
         * Expose module registry for debugging and tooling
         */
        requirejs._defined = defined;

        define = function (name, deps, callback) {

            //This module may not have dependencies
            if (!deps.splice) {
                //deps is not an array, so probably means
                //an object literal or factory function for
                //the value. Adjust args.
                callback = deps;
                deps = [];
            }

            if (!hasProp(defined, name) && !hasProp(waiting, name)) {
                waiting[name] = [name, deps, callback];
            }
        };

        define.amd = {
            jQuery: true
        };
    }());

    define("axa/amd/almond-custom", function () {});


    (function () {

        // Can't do this because several apps including ASP.NET trace
        // the stack via arguments.caller.callee and Firefox dies if
        // you try to trace through "use strict" call chains. (#13335)
        // Support: Firefox 18+
        //
        /**
        * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
        * Available via the MIT or new BSD license.
        * see: http://github.com/jrburke/almond for details
        */
        //Going sloppy to avoid 'use strict' string cost, but strict practices should
        //be followed.
        /*jslint sloppy: true */
        /*global setTimeout: false */

        var requirejs, require, define;
        (function (undef) {
            var main,
                req,
                makeMap,
                handlers,
                defined = {},
                waiting = {},
                config = {},
                defining = {},
                aps = [].slice;

            /**
            * Given a relative module name, like ./something, normalize it to
            * a real name that can be mapped to a path.
            * @param {String} name the relative name
            * @param {String} baseName a real name that the name arg is relative
            * to.
            * @returns {String} normalized name
            */
            function normalize(name, baseName) {
                var nameParts,
                    nameSegment,
                    mapValue,
                    foundMap,
                    foundI,
                    foundStarMap,
                    starI,
                    i,
                    j,
                    part,
                    baseParts = baseName && baseName.split("/"),
                    map = config.map,
                    starMap = (map && map['*']) || {};

                //Adjust any relative paths.
                if (name && name.charAt(0) === ".") {
                    //If have a base name, try to normalize against it,
                    //otherwise, assume it is a top-level require that will
                    //be relative to baseUrl in the end.
                    if (baseName) {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that "directory" and not name of the baseName's
                        //module. For instance, baseName of "one/two/three", maps to
                        //"one/two/three.js", but we want the directory, "one/two" for
                        //this normalization.
                        baseParts = baseParts.slice(0, baseParts.length - 1);

                        name = baseParts.concat(name.split("/"));

                        //start trimDots
                        for (i = 0; i < name.length; i += 1) {
                            part = name[i];
                            if (part === ".") {
                                name.splice(i, 1);
                                i -= 1;
                            } else if (part === "..") {
                                if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                                    //End of the line. Keep at least one non-dot
                                    //path segment at the front so it can be mapped
                                    //correctly to disk. Otherwise, there is likely
                                    //no path mapping for a path starting with '..'.
                                    //This can still fail, but catches the most reasonable
                                    //uses of ..
                                    break;
                                } else if (i > 0) {
                                    name.splice(i - 1, 2);
                                    i -= 2;
                                }
                            }
                        }
                        //end trimDots

                        name = name.join("/");
                    }
                }

                //Apply map config if available.
                if ((baseParts || starMap) && map) {
                    nameParts = name.split('/');

                    for (i = nameParts.length; i > 0; i -= 1) {
                        nameSegment = nameParts.slice(0, i).join("/");

                        if (baseParts) {
                            //Find the longest baseName segment match in the config.
                            //So, do joins on the biggest to smallest lengths of baseParts.
                            for (j = baseParts.length; j > 0; j -= 1) {
                                mapValue = map[baseParts.slice(0, j).join('/')];

                                //baseName segment has  config, find if it has one for
                                //this name.
                                if (mapValue) {
                                    mapValue = mapValue[nameSegment];
                                    if (mapValue) {
                                        //Match, update name to the new value.
                                        foundMap = mapValue;
                                        foundI = i;
                                        break;
                                    }
                                }
                            }
                        }

                        if (foundMap) {
                            break;
                        }

                        //Check for a star map match, but just hold on to it,
                        //if there is a shorter segment match later in a matching
                        //config, then favor over this star map.
                        if (!foundStarMap && starMap && starMap[nameSegment]) {
                            foundStarMap = starMap[nameSegment];
                            starI = i;
                        }
                    }

                    if (!foundMap && foundStarMap) {
                        foundMap = foundStarMap;
                        foundI = starI;
                    }

                    if (foundMap) {
                        nameParts.splice(0, foundI, foundMap);
                        name = nameParts.join('/');
                    }
                }

                return name;
            }

            function makeRequire(relName, forceSync) {
                return function () {
                    //A version of a require function that passes a moduleName
                    //value for items that may need to
                    //look up paths relative to the moduleName
                    return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
                };
            }

            function makeNormalize(relName) {
                return function (name) {
                    return normalize(name, relName);
                };
            }

            function makeLoad(depName) {
                return function (value) {
                    defined[depName] = value;
                };
            }

            function callDep(name) {
                if (waiting.hasOwnProperty(name)) {
                    var args = waiting[name];
                    delete waiting[name];
                    defining[name] = true;
                    main.apply(undef, args);
                }

                if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
                    throw new Error('No ' + name);
                }
                return defined[name];
            }

            //Turns a plugin!resource to [plugin, resource]
            //with the plugin being undefined if the name
            //did not have a plugin prefix.
            function splitPrefix(name) {
                var prefix,
                    index = name ? name.indexOf('!') : -1;
                if (index > -1) {
                    prefix = name.substring(0, index);
                    name = name.substring(index + 1, name.length);
                }
                return [prefix, name];
            }

            function onResourceLoad(name, defined, deps) {
                if (requirejs.onResourceLoad && name) {
                    requirejs.onResourceLoad({ defined: defined }, { id: name }, deps);
                }
            }

            /**
            * Makes a name map, normalizing the name, and using a plugin
            * for normalization if necessary. Grabs a ref to plugin
            * too, as an optimization.
            */
            makeMap = function (name, relName) {
                var plugin,
                    parts = splitPrefix(name),
                    prefix = parts[0];

                name = parts[1];

                if (prefix) {
                    prefix = normalize(prefix, relName);
                    plugin = callDep(prefix);
                }

                //Normalize according
                if (prefix) {
                    if (plugin && plugin.normalize) {
                        name = plugin.normalize(name, makeNormalize(relName));
                    } else {
                        name = normalize(name, relName);
                    }
                } else {
                    name = normalize(name, relName);
                    parts = splitPrefix(name);
                    prefix = parts[0];
                    name = parts[1];
                    if (prefix) {
                        plugin = callDep(prefix);
                    }
                }

                //Using ridiculous property names for space reasons
                return {
                    f: prefix ? prefix + '!' + name : name, //fullName
                    n: name,
                    pr: prefix,
                    p: plugin
                };
            };

            function makeConfig(name) {
                return function () {
                    return (config && config.config && config.config[name]) || {};
                };
            }

            handlers = {
                require: function (name) {
                    return makeRequire(name);
                },
                exports: function (name) {
                    var e = defined[name];
                    if (typeof e !== 'undefined') {
                        return e;
                    } else {
                        return (defined[name] = {});
                    }
                },
                module: function (name) {
                    return {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                }
            };

            main = function (name, deps, callback, relName) {
                var cjsModule,
                    depName,
                    ret,
                    map,
                    i,
                    args = [],
                    usingExports;

                //Use name if no relName
                relName = relName || name;

                //Call the callback to define the module, if necessary.
                if (typeof callback === 'function') {

                    //Pull out the defined dependencies and pass the ordered
                    //values to the callback.
                    //Default to [require, exports, module] if no deps
                    deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
                    for (i = 0; i < deps.length; i += 1) {
                        map = makeMap(deps[i], relName);
                        depName = map.f;

                        //Fast path CommonJS standard dependencies.
                        if (depName === "require") {
                            args[i] = handlers.require(name);
                        } else if (depName === "exports") {
                            //CommonJS module spec 1.1
                            args[i] = handlers.exports(name);
                            usingExports = true;
                        } else if (depName === "module") {
                            //CommonJS module spec 1.1
                            cjsModule = args[i] = handlers.module(name);
                        } else if (defined.hasOwnProperty(depName) ||
                            waiting.hasOwnProperty(depName) ||
                            defining.hasOwnProperty(depName)) {
                            args[i] = callDep(depName);
                        } else if (map.p) {
                            map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                            args[i] = defined[depName];
                        } else {
                            throw new Error(name + ' missing ' + depName);
                        }
                    }

                    ret = callback.apply(defined[name], args);

                    if (name) {
                        //If setting exports via "module" is in play,
                        //favor that over return value and exports. After that,
                        //favor a non-undefined return value over exports use.
                        if (cjsModule && cjsModule.exports !== undef &&
                            cjsModule.exports !== defined[name]) {
                            defined[name] = cjsModule.exports;
                        } else if (ret !== undef || !usingExports) {
                            //Use the return value from the function.
                            defined[name] = ret;
                        }
                    }
                } else if (name) {
                    //May just be an object definition for the module. Only
                    //worry about defining if have a module name.
                    defined[name] = callback;
                }

                onResourceLoad(name, defined, args);
            };

            requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
                if (typeof deps === "string") {
                    if (handlers[deps]) {
                        //callback in this case is really relName
                        return handlers[deps](callback);
                    }
                    //Just return the module wanted. In this scenario, the
                    //deps arg is the module name, and second arg (if passed)
                    //is just the relName.
                    //Normalize module name, if it contains . or ..
                    return callDep(makeMap(deps, callback).f);
                } else if (!deps.splice) {
                    //deps is a config object, not an array.
                    config = deps;
                    if (callback.splice) {
                        //callback is an array, which means it is a dependency list.
                        //Adjust args if there are dependencies
                        deps = callback;
                        callback = relName;
                        relName = null;
                    } else {
                        deps = undef;
                    }
                }

                //Support require(['a'])
                callback = callback || function () {};

                //If relName is a function, it is an errback handler,
                //so remove it.
                if (typeof relName === 'function') {
                    relName = forceSync;
                    forceSync = alt;
                }

                //Simulate async callback;
                if (forceSync) {
                    main(undef, deps, callback, relName);
                } else {
                    setTimeout(function () {
                        main(undef, deps, callback, relName);
                    }, 15);
                }

                return req;
            };

            /**
            * Just drops the config on the floor, but returns req in case
            * the config return value is used.
            */
            req.config = function (cfg) {
                config = cfg;
                return req;
            };

            define = function (name, deps, callback) {

                //This module may not have dependencies
                if (!deps.splice) {
                    //deps is not an array, so probably means
                    //an object literal or factory function for
                    //the value. Adjust args.
                    callback = deps;
                    deps = [];
                }

                waiting[name] = [name, deps, callback];
            };

            define.amd = {
                jQuery: true
            };
        }());

        /*!
        * Globalize
        *
        * http://github.com/jquery/globalize
        *
        * Copyright Software Freedom Conservancy, Inc.
        * Dual licensed under the MIT or GPL Version 2 licenses.
        * http://jquery.org/license
        */

        (function (window, undefined) {

            var Globalize,
                // private variables
                regexHex,
                regexInfinity,
                regexParseFloat,
                regexTrim,
                // private JavaScript utility functions
                arrayIndexOf,
                endsWith,
                extend,
                isArray,
                isFunction,
                isObject,
                startsWith,
                trim,
                truncate,
                zeroPad,
                // private Globalization utility functions
                appendPreOrPostMatch,
                expandFormat,
                formatDate,
                formatNumber,
                getTokenRegExp,
                getEra,
                getEraYear,
                parseExact,
                parseNegativePattern;

            // Global variable (Globalize) or CommonJS module (globalize)
            Globalize = function (cultureSelector) {
                return new Globalize.prototype.init(cultureSelector);
            };

            if (typeof require !== "undefined" &&
                typeof exports !== "undefined" &&
                typeof module !== "undefined") {
                // Assume CommonJS
                module.exports = Globalize;
            } else {
                // Export as global variable
                window.Globalize = Globalize;
            }

            Globalize.cultures = {};

            Globalize.prototype = {
                constructor: Globalize,
                init: function (cultureSelector) {
                    this.cultures = Globalize.cultures;
                    this.cultureSelector = cultureSelector;

                    return this;
                }
            };
            Globalize.prototype.init.prototype = Globalize.prototype;

            // 1. When defining a culture, all fields are required except the ones stated as optional.
            // 2. Each culture should have a ".calendars" object with at least one calendar named "standard"
            //    which serves as the default calendar in use by that culture.
            // 3. Each culture should have a ".calendar" object which is the current calendar being used,
            //    it may be dynamically changed at any time to one of the calendars in ".calendars".
            Globalize.cultures["default"] = {
                // A unique name for the culture in the form <language code>-<country/region code>
                name: "en",
                // the name of the culture in the english language
                englishName: "English",
                // the name of the culture in its own language
                nativeName: "English",
                // whether the culture uses right-to-left text
                isRTL: false,
                // "language" is used for so-called "specific" cultures.
                // For example, the culture "es-CL" means "Spanish, in Chili".
                // It represents the Spanish-speaking culture as it is in Chili,
                // which might have different formatting rules or even translations
                // than Spanish in Spain. A "neutral" culture is one that is not
                // specific to a region. For example, the culture "es" is the generic
                // Spanish culture, which may be a more generalized version of the language
                // that may or may not be what a specific culture expects.
                // For a specific culture like "es-CL", the "language" field refers to the
                // neutral, generic culture information for the language it is using.
                // This is not always a simple matter of the string before the dash.
                // For example, the "zh-Hans" culture is netural (Simplified Chinese).
                // And the "zh-SG" culture is Simplified Chinese in Singapore, whose lanugage
                // field is "zh-CHS", not "zh".
                // This field should be used to navigate from a specific culture to it's
                // more general, neutral culture. If a culture is already as general as it
                // can get, the language may refer to itself.
                language: "en",
                // numberFormat defines general number formatting rules, like the digits in
                // each grouping, the group separator, and how negative numbers are displayed.
                numberFormat: {
                    // [negativePattern]
                    // Note, numberFormat.pattern has no "positivePattern" unlike percent and currency,
                    // but is still defined as an array for consistency with them.
                    //   negativePattern: one of "(n)|-n|- n|n-|n -"
                    pattern: ["-n"],
                    // number of decimal places normally shown
                    decimals: 2,
                    // string that separates number groups, as in 1,000,000
                    ",": ",",
                    // string that separates a number from the fractional portion, as in 1.99
                    ".": ".",
                    // array of numbers indicating the size of each number group.
                    // TODO: more detailed description and example
                    groupSizes: [3],
                    // symbol used for positive numbers
                    "+": "+",
                    // symbol used for negative numbers
                    "-": "-",
                    // symbol used for NaN (Not-A-Number)
                    "NaN": "NaN",
                    // symbol used for Negative Infinity
                    negativeInfinity: "-Infinity",
                    // symbol used for Positive Infinity
                    positiveInfinity: "Infinity",
                    percent: {
                        // [negativePattern, positivePattern]
                        //   negativePattern: one of "-n %|-n%|-%n|%-n|%n-|n-%|n%-|-% n|n %-|% n-|% -n|n- %"
                        //   positivePattern: one of "n %|n%|%n|% n"
                        pattern: ["-n %", "n %"],
                        // number of decimal places normally shown
                        decimals: 2,
                        // array of numbers indicating the size of each number group.
                        // TODO: more detailed description and example
                        groupSizes: [3],
                        // string that separates number groups, as in 1,000,000
                        ",": ",",
                        // string that separates a number from the fractional portion, as in 1.99
                        ".": ".",
                        // symbol used to represent a percentage
                        symbol: "%"
                    },
                    currency: {
                        // [negativePattern, positivePattern]
                        //   negativePattern: one of "($n)|-$n|$-n|$n-|(n$)|-n$|n-$|n$-|-n $|-$ n|n $-|$ n-|$ -n|n- $|($ n)|(n $)"
                        //   positivePattern: one of "$n|n$|$ n|n $"
                        pattern: ["($n)", "$n"],
                        // number of decimal places normally shown
                        decimals: 2,
                        // array of numbers indicating the size of each number group.
                        // TODO: more detailed description and example
                        groupSizes: [3],
                        // string that separates number groups, as in 1,000,000
                        ",": ",",
                        // string that separates a number from the fractional portion, as in 1.99
                        ".": ".",
                        // symbol used to represent currency
                        symbol: "$"
                    }
                },
                // calendars defines all the possible calendars used by this culture.
                // There should be at least one defined with name "standard", and is the default
                // calendar used by the culture.
                // A calendar contains information about how dates are formatted, information about
                // the calendar's eras, a standard set of the date formats,
                // translations for day and month names, and if the calendar is not based on the Gregorian
                // calendar, conversion functions to and from the Gregorian calendar.
                calendars: {
                    standard: {
                        // name that identifies the type of calendar this is
                        name: "Gregorian_USEnglish",
                        // separator of parts of a date (e.g. "/" in 11/05/1955)
                        "/": "/",
                        // separator of parts of a time (e.g. ":" in 05:44 PM)
                        ":": ":",
                        // the first day of the week (0 = Sunday, 1 = Monday, etc)
                        firstDay: 0,
                        days: {
                            // full day names
                            names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                            // abbreviated day names
                            namesAbbr: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                            // shortest day names
                            namesShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                        },
                        months: {
                            // full month names (13 months for lunar calendards -- 13th month should be "" if not lunar)
                            names: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", ""],
                            // abbreviated month names
                            namesAbbr: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", ""]
                        },
                        // AM and PM designators in one of these forms:
                        // The usual view, and the upper and lower case versions
                        //   [ standard, lowercase, uppercase ]
                        // The culture does not use AM or PM (likely all standard date formats use 24 hour time)
                        //   null
                        AM: ["AM", "am", "AM"],
                        PM: ["PM", "pm", "PM"],
                        eras: [
                            // eras in reverse chronological order.
                            // name: the name of the era in this culture (e.g. A.D., C.E.)
                            // start: when the era starts in ticks (gregorian, gmt), null if it is the earliest supported era.
                            // offset: offset in years from gregorian calendar
                            {
                                "name": "A.D.",
                                "start": null,
                                "offset": 0
                            }
                        ],
                        // when a two digit year is given, it will never be parsed as a four digit
                        // year greater than this year (in the appropriate era for the culture)
                        // Set it as a full year (e.g. 2029) or use an offset format starting from
                        // the current year: "+19" would correspond to 2029 if the current year 2010.
                        twoDigitYearMax: 2029,
                        // set of predefined date and time patterns used by the culture
                        // these represent the format someone in this culture would expect
                        // to see given the portions of the date that are shown.
                        patterns: {
                            // short date pattern
                            d: "M/d/yyyy",
                            // long date pattern
                            D: "dddd, MMMM dd, yyyy",
                            // short time pattern
                            t: "h:mm tt",
                            // long time pattern
                            T: "h:mm:ss tt",
                            // long date, short time pattern
                            f: "dddd, MMMM dd, yyyy h:mm tt",
                            // long date, long time pattern
                            F: "dddd, MMMM dd, yyyy h:mm:ss tt",
                            // month/day pattern
                            M: "MMMM dd",
                            // month/year pattern
                            Y: "yyyy MMMM",
                            // S is a sortable format that does not vary by culture
                            S: "yyyy\u0027-\u0027MM\u0027-\u0027dd\u0027T\u0027HH\u0027:\u0027mm\u0027:\u0027ss"
                        }
                        // optional fields for each calendar:
                        /*
                        monthsGenitive:
                        Same as months but used when the day preceeds the month.
                        Omit if the culture has no genitive distinction in month names.
                        For an explaination of genitive months, see http://blogs.msdn.com/michkap/archive/2004/12/25/332259.aspx
                        convert:
                        Allows for the support of non-gregorian based calendars. This convert object is used to
                        to convert a date to and from a gregorian calendar date to handle parsing and formatting.
                        The two functions:
                        fromGregorian( date )
                        Given the date as a parameter, return an array with parts [ year, month, day ]
                        corresponding to the non-gregorian based year, month, and day for the calendar.
                        toGregorian( year, month, day )
                        Given the non-gregorian year, month, and day, return a new Date() object
                        set to the corresponding date in the gregorian calendar.
                        */
                    }
                },
                // For localized strings
                messages: {}
            };

            Globalize.cultures["default"].calendar = Globalize.cultures["default"].calendars.standard;

            Globalize.cultures.en = Globalize.cultures["default"];

            Globalize.cultureSelector = "en";

            //
            // private variables
            //

            regexHex = /^0x[a-f0-9]+$/i;
            regexInfinity = /^[+\-]?infinity$/i;
            regexParseFloat = /^[+\-]?\d*\.?\d*(e[+\-]?\d+)?$/;
            regexTrim = /^\s+|\s+$/g;

            //
            // private JavaScript utility functions
            //

            arrayIndexOf = function (array, item) {
                if (array.indexOf) {
                    return array.indexOf(item);
                }
                for (var i = 0, length = array.length; i < length; i++) {
                    if (array[i] === item) {
                        return i;
                    }
                }
                return -1;
            };

            endsWith = function (value, pattern) {
                return value.substr(value.length - pattern.length) === pattern;
            };

            extend = function () {
                var options,
                    name,
                    src,
                    copy,
                    copyIsArray,
                    clone,
                    target = arguments[0] || {},
                    i = 1,
                    length = arguments.length,
                    deep = false;

                // Handle a deep copy situation
                if (typeof target === "boolean") {
                    deep = target;
                    target = arguments[1] || {};
                    // skip the boolean and the target
                    i = 2;
                }

                // Handle case when target is a string or something (possible in deep copy)
                if (typeof target !== "object" && !isFunction(target)) {
                    target = {};
                }

                for (; i < length; i++) {
                    // Only deal with non-null/undefined values
                    if ((options = arguments[i]) != null) {
                        // Extend the base object
                        for (name in options) {
                            src = target[name];
                            copy = options[name];

                            // Prevent never-ending loop
                            if (target === copy) {
                                continue;
                            }

                            // Recurse if we're merging plain objects or arrays
                            if (deep && copy && (isObject(copy) || (copyIsArray = isArray(copy)))) {
                                if (copyIsArray) {
                                    copyIsArray = false;
                                    clone = src && isArray(src) ? src : [];

                                } else {
                                    clone = src && isObject(src) ? src : {};
                                }

                                // Never move original objects, clone them
                                target[name] = extend(deep, clone, copy);

                                // Don't bring in undefined values
                            } else if (copy !== undefined) {
                                target[name] = copy;
                            }
                        }
                    }
                }

                // Return the modified object
                return target;
            };

            isArray = Array.isArray || function (obj) {
                return Object.prototype.toString.call(obj) === "[object Array]";
            };

            isFunction = function (obj) {
                return Object.prototype.toString.call(obj) === "[object Function]";
            };

            isObject = function (obj) {
                return Object.prototype.toString.call(obj) === "[object Object]";
            };

            startsWith = function (value, pattern) {
                return value.indexOf(pattern) === 0;
            };

            trim = function (value) {
                return (value + "").replace(regexTrim, "");
            };

            truncate = function (value) {
                if (isNaN(value)) {
                    return NaN;
                }
                return Math[value < 0 ? "ceil" : "floor"](value);
            };

            zeroPad = function (str, count, left) {
                var l;
                for (l = str.length; l < count; l += 1) {
                    str = (left ? ("0" + str) : (str + "0"));
                }
                return str;
            };

            //
            // private Globalization utility functions
            //

            appendPreOrPostMatch = function (preMatch, strings) {
                // appends pre- and post- token match strings while removing escaped characters.
                // Returns a single quote count which is used to determine if the token occurs
                // in a string literal.
                var quoteCount = 0,
                    escaped = false;
                for (var i = 0, il = preMatch.length; i < il; i++) {
                    var c = preMatch.charAt(i);
                    switch (c) {
                    case "\'":
                        if (escaped) {
                            strings.push("\'");
                        } else {
                            quoteCount++;
                        }
                        escaped = false;
                        break;
                    case "\\":
                        if (escaped) {
                            strings.push("\\");
                        }
                        escaped = !escaped;
                        break;
                    default:
                        strings.push(c);
                        escaped = false;
                        break;
                    }
                }
                return quoteCount;
            };

            expandFormat = function (cal, format) {
                // expands unspecified or single character date formats into the full pattern.
                format = format || "F";
                var pattern,
                    patterns = cal.patterns,
                    len = format.length;
                if (len === 1) {
                    pattern = patterns[format];
                    if (!pattern) {
                        throw "Invalid date format string \'" + format + "\'.";
                    }
                    format = pattern;
                } else if (len === 2 && format.charAt(0) === "%") {
                    // %X escape format -- intended as a custom format string that is only one character, not a built-in format.
                    format = format.charAt(1);
                }
                return format;
            };

            formatDate = function (value, format, culture) {
                var cal = culture.calendar,
                    convert = cal.convert,
                    ret;

                if (!format || !format.length || format === "i") {
                    if (culture && culture.name.length) {
                        if (convert) {
                            // non-gregorian calendar, so we cannot use built-in toLocaleString()
                            ret = formatDate(value, cal.patterns.F, culture);
                        } else {
                            var eraDate = new Date(value.getTime()),
                                era = getEra(value, cal.eras);
                            eraDate.setFullYear(getEraYear(value, cal, era));
                            ret = eraDate.toLocaleString();
                        }
                    } else {
                        ret = value.toString();
                    }
                    return ret;
                }

                var eras = cal.eras,
                    sortable = format === "s";
                format = expandFormat(cal, format);

                // Start with an empty string
                ret = [];
                var hour,
                    zeros = ["0", "00", "000"],
                    foundDay,
                    checkedDay,
                    dayPartRegExp = /([^d]|^)(d|dd)([^d]|$)/g,
                    quoteCount = 0,
                    tokenRegExp = getTokenRegExp(),
                    converted;

                function padZeros(num, c) {
                    var r, s = num + "";
                    if (c > 1 && s.length < c) {
                        r = (zeros[c - 2] + s);
                        return r.substr(r.length - c, c);
                    } else {
                        r = s;
                    }
                    return r;
                }

                function hasDay() {
                    if (foundDay || checkedDay) {
                        return foundDay;
                    }
                    foundDay = dayPartRegExp.test(format);
                    checkedDay = true;
                    return foundDay;
                }

                function getPart(date, part) {
                    if (converted) {
                        return converted[part];
                    }
                    switch (part) {
                    case 0:
                        return date.getFullYear();
                    case 1:
                        return date.getMonth();
                    case 2:
                        return date.getDate();
                    default:
                        throw "Invalid part value " + part;
                    }
                }

                if (!sortable && convert) {
                    converted = convert.fromGregorian(value);
                }

                for (;;) {
                    // Save the current index
                    var index = tokenRegExp.lastIndex,
                        // Look for the next pattern
                        ar = tokenRegExp.exec(format);

                    // Append the text before the pattern (or the end of the string if not found)
                    var preMatch = format.slice(index, ar ? ar.index : format.length);
                    quoteCount += appendPreOrPostMatch(preMatch, ret);

                    if (!ar) {
                        break;
                    }

                    // do not replace any matches that occur inside a string literal.
                    if (quoteCount % 2) {
                        ret.push(ar[0]);
                        continue;
                    }

                    var current = ar[0],
                        clength = current.length;

                    switch (current) {
                    case "ddd":
                    //Day of the week, as a three-letter abbreviation
                    case "dddd":
                        // Day of the week, using the full name
                        var names = (clength === 3) ? cal.days.namesAbbr : cal.days.names;
                        ret.push(names[value.getDay()]);
                        break;
                    case "d":
                    // Day of month, without leading zero for single-digit days
                    case "dd":
                        // Day of month, with leading zero for single-digit days
                        foundDay = true;
                        ret.push(
                            padZeros(getPart(value, 2), clength)
                        );
                        break;
                    case "MMM":
                    // Month, as a three-letter abbreviation
                    case "MMMM":
                        // Month, using the full name
                        var part = getPart(value, 1);
                        ret.push(
                            (cal.monthsGenitive && hasDay()) ?
                            (cal.monthsGenitive[clength === 3 ? "namesAbbr" : "names"][part]) :
                            (cal.months[clength === 3 ? "namesAbbr" : "names"][part])
                        );
                        break;
                    case "M":
                    // Month, as digits, with no leading zero for single-digit months
                    case "MM":
                        // Month, as digits, with leading zero for single-digit months
                        ret.push(
                            padZeros(getPart(value, 1) + 1, clength)
                        );
                        break;
                    case "y":
                    // Year, as two digits, but with no leading zero for years less than 10
                    case "yy":
                    // Year, as two digits, with leading zero for years less than 10
                    case "yyyy":
                        // Year represented by four full digits
                        part = converted ? converted[0] : getEraYear(value, cal, getEra(value, eras), sortable);
                        if (clength < 4) {
                            part = part % 100;
                        }
                        ret.push(
                            padZeros(part, clength)
                        );
                        break;
                    case "h":
                    // Hours with no leading zero for single-digit hours, using 12-hour clock
                    case "hh":
                        // Hours with leading zero for single-digit hours, using 12-hour clock
                        hour = value.getHours() % 12;
                        if (hour === 0) hour = 12;
                        ret.push(
                            padZeros(hour, clength)
                        );
                        break;
                    case "H":
                    // Hours with no leading zero for single-digit hours, using 24-hour clock
                    case "HH":
                        // Hours with leading zero for single-digit hours, using 24-hour clock
                        ret.push(
                            padZeros(value.getHours(), clength)
                        );
                        break;
                    case "m":
                    // Minutes with no leading zero for single-digit minutes
                    case "mm":
                        // Minutes with leading zero for single-digit minutes
                        ret.push(
                            padZeros(value.getMinutes(), clength)
                        );
                        break;
                    case "s":
                    // Seconds with no leading zero for single-digit seconds
                    case "ss":
                        // Seconds with leading zero for single-digit seconds
                        ret.push(
                            padZeros(value.getSeconds(), clength)
                        );
                        break;
                    case "t":
                    // One character am/pm indicator ("a" or "p")
                    case "tt":
                        // Multicharacter am/pm indicator
                        part = value.getHours() < 12 ? (cal.AM ? cal.AM[0] : " ") : (cal.PM ? cal.PM[0] : " ");
                        ret.push(clength === 1 ? part.charAt(0) : part);
                        break;
                    case "f":
                    // Deciseconds
                    case "ff":
                    // Centiseconds
                    case "fff":
                        // Milliseconds
                        ret.push(
                            padZeros(value.getMilliseconds(), 3).substr(0, clength)
                        );
                        break;
                    case "z":
                    // Time zone offset, no leading zero
                    case "zz":
                        // Time zone offset with leading zero
                        hour = value.getTimezoneOffset() / 60;
                        ret.push(
                            (hour <= 0 ? "+" : "-") + padZeros(Math.floor(Math.abs(hour)), clength)
                        );
                        break;
                    case "zzz":
                        // Time zone offset with leading zero
                        hour = value.getTimezoneOffset() / 60;
                        ret.push(
                            (hour <= 0 ? "+" : "-") + padZeros(Math.floor(Math.abs(hour)), 2) +
                            // Hard coded ":" separator, rather than using cal.TimeSeparator
                            // Repeated here for consistency, plus ":" was already assumed in date parsing.
                            ":" + padZeros(Math.abs(value.getTimezoneOffset() % 60), 2)
                        );
                        break;
                    case "g":
                    case "gg":
                        if (cal.eras) {
                            ret.push(
                                cal.eras[getEra(value, eras)].name
                            );
                        }
                        break;
                    case "/":
                        ret.push(cal["/"]);
                        break;
                    default:
                        throw "Invalid date format pattern \'" + current + "\'.";
                    }
                }
                return ret.join("");
            };

            // formatNumber
            (function () {
                var expandNumber;

                expandNumber = function (number, precision, formatInfo) {
                    var groupSizes = formatInfo.groupSizes,
                        curSize = groupSizes[0],
                        curGroupIndex = 1,
                        factor = Math.pow(10, precision),
                        rounded = Math.round(number * factor) / factor;

                    if (!isFinite(rounded)) {
                        rounded = number;
                    }
                    number = rounded;

                    var numberString = number + "",
                        right = "",
                        split = numberString.split(/e/i),
                        exponent = split.length > 1 ? parseInt(split[1], 10) : 0;
                    numberString = split[0];
                    split = numberString.split(".");
                    numberString = split[0];
                    right = split.length > 1 ? split[1] : "";

                    if (exponent > 0) {
                        right = zeroPad(right, exponent, false);
                        numberString += right.slice(0, exponent);
                        right = right.substr(exponent);
                    } else if (exponent < 0) {
                        exponent = -exponent;
                        numberString = zeroPad(numberString, exponent + 1, true);
                        right = numberString.slice(-exponent, numberString.length) + right;
                        numberString = numberString.slice(0, -exponent);
                    }

                    if (precision > 0) {
                        right = formatInfo["."] +
                        ((right.length > precision) ? right.slice(0, precision) : zeroPad(right, precision));
                    } else {
                        right = "";
                    }

                    var stringIndex = numberString.length - 1,
                        sep = formatInfo[","],
                        ret = "";

                    while (stringIndex >= 0) {
                        if (curSize === 0 || curSize > stringIndex) {
                            return numberString.slice(0, stringIndex + 1) + (ret.length ? (sep + ret + right) : right);
                        }
                        ret = numberString.slice(stringIndex - curSize + 1, stringIndex + 1) + (ret.length ? (sep + ret) : "");

                        stringIndex -= curSize;

                        if (curGroupIndex < groupSizes.length) {
                            curSize = groupSizes[curGroupIndex];
                            curGroupIndex++;
                        }
                    }

                    return numberString.slice(0, stringIndex + 1) + sep + ret + right;
                };

                formatNumber = function (value, format, culture) {
                    if (!isFinite(value)) {
                        if (value === Infinity) {
                            return culture.numberFormat.positiveInfinity;
                        }
                        if (value === -Infinity) {
                            return culture.numberFormat.negativeInfinity;
                        }
                        return culture.numberFormat.NaN;
                    }
                    if (!format || format === "i") {
                        return culture.name.length ? value.toLocaleString() : value.toString();
                    }
                    format = format || "D";

                    var nf = culture.numberFormat,
                        number = Math.abs(value),
                        precision = -1,
                        pattern;
                    if (format.length > 1) precision = parseInt(format.slice(1), 10);

                    var current = format.charAt(0).toUpperCase(),
                        formatInfo;

                    switch (current) {
                    case "D":
                        pattern = "n";
                        number = truncate(number);
                        if (precision !== -1) {
                            number = zeroPad("" + number, precision, true);
                        }
                        if (value < 0) number = "-" + number;
                        break;
                    case "N":
                        formatInfo = nf;
                    /* falls through */
                    case "C":
                        formatInfo = formatInfo || nf.currency;
                    /* falls through */
                    case "P":
                        formatInfo = formatInfo || nf.percent;
                        pattern = value < 0 ? formatInfo.pattern[0] : (formatInfo.pattern[1] || "n");
                        if (precision === -1) precision = formatInfo.decimals;
                        number = expandNumber(number * (current === "P" ? 100 : 1), precision, formatInfo);
                        break;
                    default:
                        throw "Bad number format specifier: " + current;
                    }

                    var patternParts = /n|\$|-|%/g,
                        ret = "";
                    for (;;) {
                        var index = patternParts.lastIndex,
                            ar = patternParts.exec(pattern);

                        ret += pattern.slice(index, ar ? ar.index : pattern.length);

                        if (!ar) {
                            break;
                        }

                        switch (ar[0]) {
                        case "n":
                            ret += number;
                            break;
                        case "$":
                            ret += nf.currency.symbol;
                            break;
                        case "-":
                            // don't make 0 negative
                            if (/[1-9]/.test(number)) {
                                ret += nf["-"];
                            }
                            break;
                        case "%":
                            ret += nf.percent.symbol;
                            break;
                        }
                    }

                    return ret;
                };

            }());

            getTokenRegExp = function () {
                // regular expression for matching date and time tokens in format strings.
                return (/\/|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z|gg|g/g);
            };

            getEra = function (date, eras) {
                if (!eras) return 0;
                var start, ticks = date.getTime();
                for (var i = 0, l = eras.length; i < l; i++) {
                    start = eras[i].start;
                    if (start === null || ticks >= start) {
                        return i;
                    }
                }
                return 0;
            };

            getEraYear = function (date, cal, era, sortable) {
                var year = date.getFullYear();
                if (!sortable && cal.eras) {
                    // convert normal gregorian year to era-shifted gregorian
                    // year by subtracting the era offset
                    year -= cal.eras[era].offset;
                }
                return year;
            };

            // parseExact
            (function () {
                var expandYear,
                    getDayIndex,
                    getMonthIndex,
                    getParseRegExp,
                    outOfRange,
                    toUpper,
                    toUpperArray;

                expandYear = function (cal, year) {
                    // expands 2-digit year into 4 digits.
                    if (year < 100) {
                        var now = new Date(),
                            era = getEra(now),
                            curr = getEraYear(now, cal, era),
                            twoDigitYearMax = cal.twoDigitYearMax;
                        twoDigitYearMax = typeof twoDigitYearMax === "string" ? new Date().getFullYear() % 100 + parseInt(twoDigitYearMax, 10) : twoDigitYearMax;
                        year += curr - (curr % 100);
                        if (year > twoDigitYearMax) {
                            year -= 100;
                        }
                    }
                    return year;
                };

                getDayIndex = function (cal, value, abbr) {
                    var ret,
                        days = cal.days,
                        upperDays = cal._upperDays;
                    if (!upperDays) {
                        cal._upperDays = upperDays = [
                            toUpperArray(days.names),
                            toUpperArray(days.namesAbbr),
                            toUpperArray(days.namesShort)
                        ];
                    }
                    value = toUpper(value);
                    if (abbr) {
                        ret = arrayIndexOf(upperDays[1], value);
                        if (ret === -1) {
                            ret = arrayIndexOf(upperDays[2], value);
                        }
                    } else {
                        ret = arrayIndexOf(upperDays[0], value);
                    }
                    return ret;
                };

                getMonthIndex = function (cal, value, abbr) {
                    var months = cal.months,
                        monthsGen = cal.monthsGenitive || cal.months,
                        upperMonths = cal._upperMonths,
                        upperMonthsGen = cal._upperMonthsGen;
                    if (!upperMonths) {
                        cal._upperMonths = upperMonths = [
                            toUpperArray(months.names),
                            toUpperArray(months.namesAbbr)
                        ];
                        cal._upperMonthsGen = upperMonthsGen = [
                            toUpperArray(monthsGen.names),
                            toUpperArray(monthsGen.namesAbbr)
                        ];
                    }
                    value = toUpper(value);
                    var i = arrayIndexOf(abbr ? upperMonths[1] : upperMonths[0], value);
                    if (i < 0) {
                        i = arrayIndexOf(abbr ? upperMonthsGen[1] : upperMonthsGen[0], value);
                    }
                    return i;
                };

                getParseRegExp = function (cal, format) {
                    // converts a format string into a regular expression with groups that
                    // can be used to extract date fields from a date string.
                    // check for a cached parse regex.
                    var re = cal._parseRegExp;
                    if (!re) {
                        cal._parseRegExp = re = {};
                    } else {
                        var reFormat = re[format];
                        if (reFormat) {
                            return reFormat;
                        }
                    }

                    // expand single digit formats, then escape regular expression characters.
                    var expFormat = expandFormat(cal, format).replace(/([\^\$\.\*\+\?\|\[\]\(\)\{\}])/g, "\\\\$1"),
                        regexp = ["^"],
                        groups = [],
                        index = 0,
                        quoteCount = 0,
                        tokenRegExp = getTokenRegExp(),
                        match;

                    // iterate through each date token found.
                    while ((match = tokenRegExp.exec(expFormat)) !== null) {
                        var preMatch = expFormat.slice(index, match.index);
                        index = tokenRegExp.lastIndex;

                        // don't replace any matches that occur inside a string literal.
                        quoteCount += appendPreOrPostMatch(preMatch, regexp);
                        if (quoteCount % 2) {
                            regexp.push(match[0]);
                            continue;
                        }

                        // add a regex group for the token.
                        var m = match[0],
                            len = m.length,
                            add;
                        switch (m) {
                        case "dddd":
                        case "ddd":
                        case "MMMM":
                        case "MMM":
                        case "gg":
                        case "g":
                            add = "(\\D+)";
                            break;
                        case "tt":
                        case "t":
                            add = "(\\D*)";
                            break;
                        case "yyyy":
                        case "fff":
                        case "ff":
                        case "f":
                            add = "(\\d{" + len + "})";
                            break;
                        case "dd":
                        case "d":
                        case "MM":
                        case "M":
                        case "yy":
                        case "y":
                        case "HH":
                        case "H":
                        case "hh":
                        case "h":
                        case "mm":
                        case "m":
                        case "ss":
                        case "s":
                            add = "(\\d\\d?)";
                            break;
                        case "zzz":
                            add = "([+-]?\\d\\d?:\\d{2})";
                            break;
                        case "zz":
                        case "z":
                            add = "([+-]?\\d\\d?)";
                            break;
                        case "/":
                            add = "(\\/)";
                            break;
                        default:
                            throw "Invalid date format pattern \'" + m + "\'.";
                        }
                        if (add) {
                            regexp.push(add);
                        }
                        groups.push(match[0]);
                    }
                    appendPreOrPostMatch(expFormat.slice(index), regexp);
                    regexp.push("$");

                    // allow whitespace to differ when matching formats.
                    var regexpStr = regexp.join("").replace(/\s+/g, "\\s+"),
                        parseRegExp = { "regExp": regexpStr, "groups": groups };

                    // cache the regex for this format.
                    return re[format] = parseRegExp;
                };

                outOfRange = function (value, low, high) {
                    return value < low || value > high;
                };

                toUpper = function (value) {
                    // "he-IL" has non-breaking space in weekday names.
                    return value.split("\u00A0").join(" ").toUpperCase();
                };

                toUpperArray = function (arr) {
                    var results = [];
                    for (var i = 0, l = arr.length; i < l; i++) {
                        results[i] = toUpper(arr[i]);
                    }
                    return results;
                };

                parseExact = function (value, format, culture) {
                    // try to parse the date string by matching against the format string
                    // while using the specified culture for date field names.
                    value = trim(value);
                    var cal = culture.calendar,
                        // convert date formats into regular expressions with groupings.
                        // use the regexp to determine the input format and extract the date fields.
                        parseInfo = getParseRegExp(cal, format),
                        match = new RegExp(parseInfo.regExp).exec(value);
                    if (match === null) {
                        return null;
                    }
                    // found a date format that matches the input.
                    var groups = parseInfo.groups,
                        era = null,
                        year = null,
                        month = null,
                        date = null,
                        weekDay = null,
                        hour = 0,
                        hourOffset,
                        min = 0,
                        sec = 0,
                        msec = 0,
                        tzMinOffset = null,
                        pmHour = false;
                    // iterate the format groups to extract and set the date fields.
                    for (var j = 0, jl = groups.length; j < jl; j++) {
                        var matchGroup = match[j + 1];
                        if (matchGroup) {
                            var current = groups[j],
                                clength = current.length,
                                matchInt = parseInt(matchGroup, 10);
                            switch (current) {
                            case "dd":
                            case "d":
                                // Day of month.
                                date = matchInt;
                                // check that date is generally in valid range, also checking overflow below.
                                if (outOfRange(date, 1, 31)) return null;
                                break;
                            case "MMM":
                            case "MMMM":
                                month = getMonthIndex(cal, matchGroup, clength === 3);
                                if (outOfRange(month, 0, 11)) return null;
                                break;
                            case "M":
                            case "MM":
                                // Month.
                                month = matchInt - 1;
                                if (outOfRange(month, 0, 11)) return null;
                                break;
                            case "y":
                            case "yy":
                            case "yyyy":
                                year = clength < 4 ? expandYear(cal, matchInt) : matchInt;
                                if (outOfRange(year, 0, 9999)) return null;
                                break;
                            case "h":
                            case "hh":
                                // Hours (12-hour clock).
                                hour = matchInt;
                                if (hour === 12) hour = 0;
                                if (outOfRange(hour, 0, 11)) return null;
                                break;
                            case "H":
                            case "HH":
                                // Hours (24-hour clock).
                                hour = matchInt;
                                if (outOfRange(hour, 0, 23)) return null;
                                break;
                            case "m":
                            case "mm":
                                // Minutes.
                                min = matchInt;
                                if (outOfRange(min, 0, 59)) return null;
                                break;
                            case "s":
                            case "ss":
                                // Seconds.
                                sec = matchInt;
                                if (outOfRange(sec, 0, 59)) return null;
                                break;
                            case "tt":
                            case "t":
                                // AM/PM designator.
                                // see if it is standard, upper, or lower case PM. If not, ensure it is at least one of
                                // the AM tokens. If not, fail the parse for this format.
                                pmHour = cal.PM && (matchGroup === cal.PM[0] || matchGroup === cal.PM[1] || matchGroup === cal.PM[2]);
                                if (
                                    !pmHour && (
                                        !cal.AM || (matchGroup !== cal.AM[0] && matchGroup !== cal.AM[1] && matchGroup !== cal.AM[2])
                                    )
                                ) return null;
                                break;
                            case "f":
                            // Deciseconds.
                            case "ff":
                            // Centiseconds.
                            case "fff":
                                // Milliseconds.
                                msec = matchInt * Math.pow(10, 3 - clength);
                                if (outOfRange(msec, 0, 999)) return null;
                                break;
                            case "ddd":
                            // Day of week.
                            case "dddd":
                                // Day of week.
                                weekDay = getDayIndex(cal, matchGroup, clength === 3);
                                if (outOfRange(weekDay, 0, 6)) return null;
                                break;
                            case "zzz":
                                // Time zone offset in +/- hours:min.
                                var offsets = matchGroup.split(/:/);
                                if (offsets.length !== 2) return null;
                                hourOffset = parseInt(offsets[0], 10);
                                if (outOfRange(hourOffset, -12, 13)) return null;
                                var minOffset = parseInt(offsets[1], 10);
                                if (outOfRange(minOffset, 0, 59)) return null;
                                tzMinOffset = (hourOffset * 60) + (startsWith(matchGroup, "-") ? -minOffset : minOffset);
                                break;
                            case "z":
                            case "zz":
                                // Time zone offset in +/- hours.
                                hourOffset = matchInt;
                                if (outOfRange(hourOffset, -12, 13)) return null;
                                tzMinOffset = hourOffset * 60;
                                break;
                            case "g":
                            case "gg":
                                var eraName = matchGroup;
                                if (!eraName || !cal.eras) return null;
                                eraName = trim(eraName.toLowerCase());
                                for (var i = 0, l = cal.eras.length; i < l; i++) {
                                    if (eraName === cal.eras[i].name.toLowerCase()) {
                                        era = i;
                                        break;
                                    }
                                }
                                // could not find an era with that name
                                if (era === null) return null;
                                break;
                            }
                        }
                    }
                    var result = new Date(), defaultYear, convert = cal.convert;
                    defaultYear = convert ? convert.fromGregorian(result)[0] : result.getFullYear();
                    if (year === null) {
                        year = defaultYear;
                    } else if (cal.eras) {
                        // year must be shifted to normal gregorian year
                        // but not if year was not specified, its already normal gregorian
                        // per the main if clause above.
                        year += cal.eras[(era || 0)].offset;
                    }
                    // set default day and month to 1 and January, so if unspecified, these are the defaults
                    // instead of the current day/month.
                    if (month === null) {
                        month = 0;
                    }
                    if (date === null) {
                        date = 1;
                    }
                    // now have year, month, and date, but in the culture's calendar.
                    // convert to gregorian if necessary
                    if (convert) {
                        result = convert.toGregorian(year, month, date);
                        // conversion failed, must be an invalid match
                        if (result === null) return null;
                    } else {
                        // have to set year, month and date together to avoid overflow based on current date.
                        result.setFullYear(year, month, date);
                        // check to see if date overflowed for specified month (only checked 1-31 above).
                        if (result.getDate() !== date) return null;
                        // invalid day of week.
                        if (weekDay !== null && result.getDay() !== weekDay) {
                            return null;
                        }
                    }
                    // if pm designator token was found make sure the hours fit the 24-hour clock.
                    if (pmHour && hour < 12) {
                        hour += 12;
                    }
                    result.setHours(hour, min, sec, msec);
                    if (tzMinOffset !== null) {
                        // adjust timezone to utc before applying local offset.
                        var adjustedMin = result.getMinutes() - (tzMinOffset + result.getTimezoneOffset());
                        // Safari limits hours and minutes to the range of -127 to 127.  We need to use setHours
                        // to ensure both these fields will not exceed this range.     adjustedMin will range
                        // somewhere between -1440 and 1500, so we only need to split this into hours.
                        result.setHours(result.getHours() + parseInt(adjustedMin / 60, 10), adjustedMin % 60);
                    }
                    return result;
                };
            }());

            parseNegativePattern = function (value, nf, negativePattern) {
                var neg = nf["-"],
                    pos = nf["+"],
                    ret;
                switch (negativePattern) {
                case "n -":
                    neg = " " + neg;
                    pos = " " + pos;
                /* falls through */
                case "n-":
                    if (endsWith(value, neg)) {
                        ret = ["-", value.substr(0, value.length - neg.length)];
                    } else if (endsWith(value, pos)) {
                        ret = ["+", value.substr(0, value.length - pos.length)];
                    }
                    break;
                case "- n":
                    neg += " ";
                    pos += " ";
                /* falls through */
                case "-n":
                    if (startsWith(value, neg)) {
                        ret = ["-", value.substr(neg.length)];
                    } else if (startsWith(value, pos)) {
                        ret = ["+", value.substr(pos.length)];
                    }
                    break;
                case "(n)":
                    if (startsWith(value, "(") && endsWith(value, ")")) {
                        ret = ["-", value.substr(1, value.length - 2)];
                    }
                    break;
                }
                return ret || ["", value];
            };

            //
            // public instance functions
            //

            Globalize.prototype.findClosestCulture = function (cultureSelector) {
                return Globalize.findClosestCulture.call(this, cultureSelector);
            };

            Globalize.prototype.format = function (value, format, cultureSelector) {
                return Globalize.format.call(this, value, format, cultureSelector);
            };

            Globalize.prototype.localize = function (key, cultureSelector) {
                return Globalize.localize.call(this, key, cultureSelector);
            };

            Globalize.prototype.parseInt = function (value, radix, cultureSelector) {
                return Globalize.parseInt.call(this, value, radix, cultureSelector);
            };

            Globalize.prototype.parseFloat = function (value, radix, cultureSelector) {
                return Globalize.parseFloat.call(this, value, radix, cultureSelector);
            };

            Globalize.prototype.culture = function (cultureSelector) {
                return Globalize.culture.call(this, cultureSelector);
            };

            //
            // public singleton functions
            //

            Globalize.addCultureInfo = function (cultureName, baseCultureName, info) {

                var base = {},
                    isNew = false;

                if (typeof cultureName !== "string") {
                    // cultureName argument is optional string. If not specified, assume info is first
                    // and only argument. Specified info deep-extends current culture.
                    info = cultureName;
                    cultureName = this.culture().name;
                    base = this.cultures[cultureName];
                } else if (typeof baseCultureName !== "string") {
                    // baseCultureName argument is optional string. If not specified, assume info is second
                    // argument. Specified info deep-extends specified culture.
                    // If specified culture does not exist, create by deep-extending default
                    info = baseCultureName;
                    isNew = (this.cultures[cultureName] == null);
                    base = this.cultures[cultureName] || this.cultures["default"];
                } else {
                    // cultureName and baseCultureName specified. Assume a new culture is being created
                    // by deep-extending an specified base culture
                    isNew = true;
                    base = this.cultures[baseCultureName];
                }

                this.cultures[cultureName] = extend(true, {},
                    base,
                    info
                );
                // Make the standard calendar the current culture if it's a new culture
                if (isNew) {
                    this.cultures[cultureName].calendar = this.cultures[cultureName].calendars.standard;
                }
            };

            Globalize.findClosestCulture = function (name) {
                var match;
                if (!name) {
                    return this.findClosestCulture(this.cultureSelector) || this.cultures["default"];
                }
                if (typeof name === "string") {
                    name = name.split(",");
                }
                if (isArray(name)) {
                    var lang,
                        cultures = this.cultures,
                        list = name,
                        i,
                        l = list.length,
                        prioritized = [];
                    for (i = 0; i < l; i++) {
                        name = trim(list[i]);
                        var pri, parts = name.split(";");
                        lang = trim(parts[0]);
                        if (parts.length === 1) {
                            pri = 1;
                        } else {
                            name = trim(parts[1]);
                            if (name.indexOf("q=") === 0) {
                                name = name.substr(2);
                                pri = parseFloat(name);
                                pri = isNaN(pri) ? 0 : pri;
                            } else {
                                pri = 1;
                            }
                        }
                        prioritized.push({ lang: lang, pri: pri });
                    }
                    prioritized.sort(function (a, b) {
                        if (a.pri < b.pri) {
                            return 1;
                        } else if (a.pri > b.pri) {
                            return -1;
                        }
                        return 0;
                    });
                    // exact match
                    for (i = 0; i < l; i++) {
                        lang = prioritized[i].lang;
                        match = cultures[lang];
                        if (match) {
                            return match;
                        }
                    }

                    // neutral language match
                    for (i = 0; i < l; i++) {
                        lang = prioritized[i].lang;
                        do {
                            var index = lang.lastIndexOf("-");
                            if (index === -1) {
                                break;
                            }
                            // strip off the last part. e.g. en-US => en
                            lang = lang.substr(0, index);
                            match = cultures[lang];
                            if (match) {
                                return match;
                            }
                        } while (1);
                    }

                    // last resort: match first culture using that language
                    for (i = 0; i < l; i++) {
                        lang = prioritized[i].lang;
                        for (var cultureKey in cultures) {
                            var culture = cultures[cultureKey];
                            if (culture.language === lang) {
                                return culture;
                            }
                        }
                    }
                } else if (typeof name === "object") {
                    return name;
                }
                return match || null;
            };

            Globalize.format = function (value, format, cultureSelector) {
                var culture = this.findClosestCulture(cultureSelector);
                if (value instanceof Date) {
                    value = formatDate(value, format, culture);
                } else if (typeof value === "number") {
                    value = formatNumber(value, format, culture);
                }
                return value;
            };

            Globalize.localize = function (key, cultureSelector) {
                return this.findClosestCulture(cultureSelector).messages[key] ||
                    this.cultures["default"].messages[key];
            };

            Globalize.parseDate = function (value, formats, culture) {
                culture = this.findClosestCulture(culture);

                var date, prop, patterns;
                if (formats) {
                    if (typeof formats === "string") {
                        formats = [formats];
                    }
                    if (formats.length) {
                        for (var i = 0, l = formats.length; i < l; i++) {
                            var format = formats[i];
                            if (format) {
                                date = parseExact(value, format, culture);
                                if (date) {
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    patterns = culture.calendar.patterns;
                    for (prop in patterns) {
                        date = parseExact(value, patterns[prop], culture);
                        if (date) {
                            break;
                        }
                    }
                }

                return date || null;
            };

            Globalize.parseInt = function (value, radix, cultureSelector) {
                return truncate(Globalize.parseFloat(value, radix, cultureSelector));
            };

            Globalize.parseFloat = function (value, radix, cultureSelector) {
                // radix argument is optional
                if (typeof radix !== "number") {
                    cultureSelector = radix;
                    radix = 10;
                }

                var culture = this.findClosestCulture(cultureSelector);
                var ret = NaN,
                    nf = culture.numberFormat;

                if (value.indexOf(culture.numberFormat.currency.symbol) > -1) {
                    // remove currency symbol
                    value = value.replace(culture.numberFormat.currency.symbol, "");
                    // replace decimal seperator
                    value = value.replace(culture.numberFormat.currency["."], culture.numberFormat["."]);
                }

                //Remove percentage character from number string before parsing
                if (value.indexOf(culture.numberFormat.percent.symbol) > -1) {
                    value = value.replace(culture.numberFormat.percent.symbol, "");
                }

                // remove spaces: leading, trailing and between - and number. Used for negative currency pt-BR
                value = value.replace(/ /g, "");

                // allow infinity or hexidecimal
                if (regexInfinity.test(value)) {
                    ret = parseFloat(value);
                } else if (!radix && regexHex.test(value)) {
                    ret = parseInt(value, 16);
                } else {

                    // determine sign and number
                    var signInfo = parseNegativePattern(value, nf, nf.pattern[0]),
                        sign = signInfo[0],
                        num = signInfo[1];

                    // #44 - try parsing as "(n)"
                    if (sign === "" && nf.pattern[0] !== "(n)") {
                        signInfo = parseNegativePattern(value, nf, "(n)");
                        sign = signInfo[0];
                        num = signInfo[1];
                    }

                    // try parsing as "-n"
                    if (sign === "" && nf.pattern[0] !== "-n") {
                        signInfo = parseNegativePattern(value, nf, "-n");
                        sign = signInfo[0];
                        num = signInfo[1];
                    }

                    sign = sign || "+";

                    // determine exponent and number
                    var exponent,
                        intAndFraction,
                        exponentPos = num.indexOf("e");
                    if (exponentPos < 0) exponentPos = num.indexOf("E");
                    if (exponentPos < 0) {
                        intAndFraction = num;
                        exponent = null;
                    } else {
                        intAndFraction = num.substr(0, exponentPos);
                        exponent = num.substr(exponentPos + 1);
                    }
                    // determine decimal position
                    var integer,
                        fraction,
                        decSep = nf["."],
                        decimalPos = intAndFraction.indexOf(decSep);
                    if (decimalPos < 0) {
                        integer = intAndFraction;
                        fraction = null;
                    } else {
                        integer = intAndFraction.substr(0, decimalPos);
                        fraction = intAndFraction.substr(decimalPos + decSep.length);
                    }
                    // handle groups (e.g. 1,000,000)
                    var groupSep = nf[","];
                    integer = integer.split(groupSep).join("");
                    var altGroupSep = groupSep.replace(/\u00A0/g, " ");
                    if (groupSep !== altGroupSep) {
                        integer = integer.split(altGroupSep).join("");
                    }
                    // build a natively parsable number string
                    var p = sign + integer;
                    if (fraction !== null) {
                        p += "." + fraction;
                    }
                    if (exponent !== null) {
                        // exponent itself may have a number patternd
                        var expSignInfo = parseNegativePattern(exponent, nf, "-n");
                        p += "e" + (expSignInfo[0] || "+") + expSignInfo[1];
                    }
                    if (regexParseFloat.test(p)) {
                        ret = parseFloat(p);
                    }
                }
                return ret;
            };

            Globalize.culture = function (cultureSelector) {
                // setter
                if (typeof cultureSelector !== "undefined") {
                    this.cultureSelector = cultureSelector;
                }
                // getter
                return this.findClosestCulture(cultureSelector) || this.cultures["default"];
            };

        }(this));

        /*
        * Globalize Culture fr
        *
        * http://github.com/jquery/globalize
        *
        * Copyright Software Freedom Conservancy, Inc.
        * Dual licensed under the MIT or GPL Version 2 licenses.
        * http://jquery.org/license
        *
        * This file was generated by the Globalize Culture Generator
        * Translation: bugs found in this file need to be fixed in the generator
        */

        (function (window, undefined) {

            var Globalize;

            if (typeof require !== "undefined" &&
                typeof exports !== "undefined" &&
                typeof module !== "undefined") {
                // Assume CommonJS
                Globalize = require("globalize");
            } else {
                // Global variable
                Globalize = window.Globalize;
            }

            Globalize.addCultureInfo("fr", "default", {
                name: "fr",
                englishName: "French",
                nativeName: "français",
                language: "fr",
                numberFormat: {
                    ",": " ",
                    ".": ",",
                    "NaN": "Non Numérique",
                    negativeInfinity: "-Infini",
                    positiveInfinity: "+Infini",
                    percent: {
                        ",": " ",
                        ".": ","
                    },
                    currency: {
                        pattern: ["-n $", "n $"],
                        ",": " ",
                        ".": ",",
                        symbol: "€"
                    }
                },
                calendars: {
                    standard: {
                        firstDay: 1,
                        days: {
                            names: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
                            namesAbbr: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
                            namesShort: ["di", "lu", "ma", "me", "je", "ve", "sa"]
                        },
                        months: {
                            names: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre", ""],
                            namesAbbr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc.", ""]
                        },
                        AM: null,
                        PM: null,
                        eras: [{ "name": "ap. J.-C.", "start": null, "offset": 0 }],
                        patterns: {
                            d: "dd/MM/yyyy",
                            D: "dddd d MMMM yyyy",
                            t: "HH:mm",
                            T: "HH:mm:ss",
                            f: "dddd d MMMM yyyy HH:mm",
                            F: "dddd d MMMM yyyy HH:mm:ss",
                            M: "d MMMM",
                            Y: "MMMM yyyy"
                        }
                    }
                }
            });

        }(this));

        function validatedate(inputText) {
            if (!inputText) {
                return true;
            }
            // On gère les 2 types de date, celui ISO de la RFC 3339 et le dd/MM/yyyy
            var isoDateRegex = /^(\d{4})[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])(T.*)?$/;
            var frenchDateRegex = /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-](\d{4})$/;
            var match = inputText.match(isoDateRegex);
            var matchesIndex = { day: 3, month: 2, year: 1 };
            if (!match) {
                match = inputText.match(frenchDateRegex);
                // Si ça ne match à aucune regex, alors on ne connaît pas le format
                if (!match) {
                    return false;
                }
                matchesIndex = { day: 1, month: 2, year: 3 };
            }

            var day = parseInt(match[matchesIndex.day], 10);
            var month = parseInt(match[matchesIndex.month], 10) - 1;
            var year = parseInt(match[matchesIndex.year], 10);

            // On créée une date Javascript à partir des entrées
            var builtDate = new Date(year, month, day, 0, 0, 0, 0);

            // Une date est valide si les valeurs de la chaîne entrée correspondent à ceux de la date JS
            // => (new Date(2014, 11, 35, 0, 0, 0, 0, 0)).getMonth() !== 11 et (new Date(2014, 11, 35, 0, 0, 0, 0, 0)).getDate() !== 35
            return builtDate.getDate() === day && builtDate.getMonth() === month && builtDate.getFullYear() === year;
        };


        var validation = {
            version: '1.0.0',

            // Configuration par défaut.
            configuration: {
                ssn: {
                    male: 'M',
                    female: 'F',
                    other: 'O'
                },
                dates: {
                    dateProvider: function () {
                        var date = new Date();
                        date.setHours(0, 0, 0, 0);
                        return date;
                    }
                },
                culture: {
                    defaultCulture: 'fr',
                    setCulture: function (culture) {
                        Globalize.culture(culture);
                    }
                },
                zipCode: {
                    defaultCountry: 'FR'
                }
            },


            /* --------------------------------- Fonctions utilitaires --------------------------------- */

            utils:
            {
                /* vérifier si c'est une valeur vide */
                isEmptyVal: function (val) {
                    if (val === undefined) {
                        return true;
                    }
                    if (val === null) {
                        return true;
                    }
                    if (val === "") {
                        return true;
                    }
                    return false;
                },
                isNaN: function (val) {
                    return typeof val === "number" && val !== val;
                },
                isEmptyValOrNaN: function (val) {
                    return this.isEmptyVal(val) || this.isNaN(val);
                },

                bbanMapping: {
                    'A': 1,
                    'B': 2,
                    'C': 3,
                    'D': 4,
                    'E': 5,
                    'F': 6,
                    'G': 7,
                    'H': 8,
                    'I': 9,
                    'J': 1,
                    'K': 2,
                    'L': 3,
                    'M': 4,
                    'N': 5,
                    'O': 6,
                    'P': 7,
                    'Q': 8,
                    'R': 9,
                    'S': 2,
                    'T': 3,
                    'U': 4,
                    'V': 5,
                    'W': 6,
                    'X': 7,
                    'Y': 8,
                    'Z': 9
                },

                /* Convertir en chiffre les possibles lettres présente dans le rib */
                convertBban: function (val) {
                    val = val.toUpperCase();
                    var convertedVal = "";

                    for (var i = 0; i < val.length; i++) {

                        var value = validation.utils.bbanMapping[val.charAt(i)];
                        if (!!value) {
                            convertedVal += value;
                        } else {
                            convertedVal += val.charAt(i);
                        }
                    }

                    return convertedVal;
                },

                /* Convertit en chiffre les lettres du numéro IBAN */

                ibanConvert: function (data) {
                    var convertedText = "";

                    for (var i = 0; i < data.length; i++) {
                        var val = data.charAt(i);
                        if (val > "9") {
                            if (val >= "A" && val <= "Z") {
                                convertedText += (val.charCodeAt(0) - 55).toString();
                            }
                        } else if (val >= "0") {
                            convertedText += val;
                        }
                    }
                    return convertedText;
                },

                /* Convertir un string de type dd/mm/yyyy ou iso ou toute date valide en type Date */

                toDate: function (val) {
                    if (this.isDate(val)) {
                        return val;
                    }

                    var date = Globalize.parseDate(val);
                    if (date) {
                        return date;
                    }

                    // cas des dates iso données sans time zone
                    var isoDateRegex = /^(\d{4})[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])(T.*)?$/;
                    var match = val.match(isoDateRegex);
                    if (match) {
                        var day = parseInt(match[3], 10);
                        var month = parseInt(match[2], 10) - 1;
                        var year = parseInt(match[1], 10);

                        return new Date(year, month, day, 0, 0, 0, 0);
                    }

                    date = new Date(val);
                    return this.isDate(date) ? date : null;
                },

                isDate: function (val) {
                    if (Object.prototype.toString.apply(val) === "[object Date]") {
                        return !isNaN(val.getYear());
                    }
                    return false;
                },
                /* Obtenir la difference en mois entre deux dates */

                monthDiff: function (d1, d2) {
                    var months;
                    months = (d2.getFullYear() - d1.getFullYear()) * 12;
                    months -= d1.getMonth() + 1;
                    months += d2.getMonth();
                    return months;
                },
                getValue: function (o) {
                    if (angular.isUndefined(o)) {
                        return undefined;
                    }

                    if (angular.isObject(o)) {
                        if (o.hasOwnProperty("value")) {
                            if (angular.isFunction(o.value)) {
                                return o.value();
                            }
                            return o.value;
                        }
                    }

                    if (angular.isFunction(o)) {
                        return o();
                    }

                    return o;
                },
                /* Supprimer une sequence de caractères à un string*/
                trimNumberFromLeft: function (s, val) {
                    while (s.substr(s.length - 1, 1) == val && s.length > 5) {
                        s = s.substr(0, s.length - 1);
                    }
                    return s;
                },

                /* Ajouter une séquence de caractères à un string */

                padLeft: function (s, lenght, paddingChar) {
                    s = s.toString();
                    while (s.length < lenght) {
                        s = paddingChar + s;
                    }

                    return s;
                },

                formatDate: function (date) {
                    return padLeft(date.getDate(), 2, '0') + '/' + padLeft(date.getMonth(), 2, '0') + '/' + padLeft(date.getYear(), 4, '0');
                },

                // Algorithme de Luhn

                checkLuhn: function (val) {
                    var sum = 0;
                    var nDigits = val.length;
                    var parity = nDigits & 1;

                    for (var i = 0; i < nDigits; i++) {
                        var digit = parseInt(val.charAt(i), 10);

                        if ((i & 1) == parity) {
                            digit = digit * 2;

                            if (digit > 9) {
                                digit = digit - 9;
                            }
                        }

                        sum = sum + parseInt(digit, 10);
                    }

                    return (sum % 10) == 0;
                },
                formatMessage: function (message, param) {
                    return message.replace(/\{0\}/gi, param);
                }
            },
            /* --------------------------------- RIB --------------------------------- */
            bban: {
                validate: function (val) {
                    /// <summary>
                    /// Validation du format et de la clé du RIB 
                    /// Basic Bank Account Number (BBAN) = Relevé d'identité bancaire (RIB)
                    /// </summary>
                    /// <param name="val">Le RIB</param>
                    /// <returns>True si le format ou la clé sont corrects ; false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var bban = validation.utils.convertBban(val);

                    var regexp = /^([0-9]{5})[ ]?([0-9]{5})[ ]?([0-9]{11})[ ]?([0-9]{2})$/;

                    var result = regexp.exec(bban);

                    if (!result) {
                        return false;
                    }

                    var bank = result[1];
                    var sort = result[2];
                    var account = result[3];
                    var key = result[4];
                    var remaining = (89 * bank + 15 * sort + 3 * account) % 97;
                    return (97 - remaining == key);
                }
            },

            /* --------------------------------- IBAN --------------------------------- */
            iban: {
                validate: function (val) {
                    /// <summary>
                    /// Validation du format et de la clé du numéro IBAN 
                    /// International Bank Account Number (IBAN) = Relevé international d'identité bancaire
                    /// </summary>
                    /// <param name="val">Le numéro IBAN</param>
                    /// <returns>True si le format ou la clé sont corrects et false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    val = val.replace(/\s/g, '');
                    var regexp = /^[a-zA-Z]{2}\d{2}\w{10,30}$/;
                    if (!regexp.test(val)) {
                        return false;
                    }
                    val = val.toUpperCase();
                    // TODO : faire une méthode pour l'extraction du iban
                    var country = val.substr(0, 2);
                    var key = val.substr(2, 2);
                    var bban = val.substr(4);
                    var number = validation.utils.ibanConvert(bban + country) + key;

                    var keyCalculation = 0;
                    var pos = 0;
                    while (pos < number.length) {
                        keyCalculation = parseInt(keyCalculation + number.substr(pos, 9), 10) % 97;
                        pos += 9;
                    }
                    return keyCalculation % 97 == 1;
                }
            },

            /* --------------------------------- BIC --------------------------------- */
            bic: {
                validate: function (val) {
                    /// <summary>
                    /// Validation du code Swift ou BIC
                    /// Bank Identification Code(BIC) = Code d'identification bancaire
                    /// </summary>
                    /// <param name="val">le code BIC</param>
                    /// <returns>True si le format est valide</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }
                    var regBic = /^([a-zA-Z]){4}([a-zA-Z]){2}([0-9a-zA-Z]){2}([0-9a-zA-Z]{3})?$/;
                    return regBic.test(val);
                }
            },

            /* --------------------------------- Téléphone --------------------------------- */
            phone: {
                validate: function (val, countries) {
                    /// <summary>
                    /// Validation des numéro de téléphone
                    /// Les tirets, les points et les espaces sont autorisés
                    /// </summary>
                    /// <param name="val">le numéro de téléphone</param>
                    /// <returns>True si le numéro de téléphone est valide</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    if (validation.utils.isEmptyVal(countries)) {
                        var regex = /^(\+\s?)?(^(?!\+.*)\(\+?\d+([\s\-\.]?\d+)?\)|\d+)([\s\-\.]?(\(\d+([\s\-\.]?\d+)?\)|\d+))*(\s?(x|ext\.?)\s?\d+)?$/;
                        return regex.test(val);
                    }

                    var countriesConstraints = countries.split(',');
                    for (var i = 0; i < countriesConstraints.length; i++) {
                        var regexCountry = validation.phone.getRegexForCountry(countriesConstraints[i]);

                        if (!regexCountry) {
                            throw Error("Ce pays n'est pas connu : " + countriesConstraints[i]);
                        }

                        if (regexCountry.test(val)) {
                            return true;
                        }
                    }

                    return false;
                },

                getRegexForCountry: function (countryCode) {
                    return validation.phone.dictionary[countryCode];
                },

                dictionary: {
                    "AD": /^((00 ?|\+)376 ?)?([ \-.]?\d){6}$/,
                    "AL": /^((00 ?|\+)355 ?|0)?([ \-.]?\d){8}$/,
                    "AT": /^((00 ?|\+)43 ?|0)?([ \-.]?\d){4,13}$/,
                    "AU": /^((00 ?|\+)61 ?|0)?([ \-.]?\d){9}$/,
                    "BA": /^((00 ?|\+)387 ?|0)?([ \-.]?\d){8}$/,
                    "BE": /^((00 ?|\+)32 ?|0)?([ \-.]?\d){8}$/,
                    "BG": /^((00 ?|\+)359 ?|0)?([ \-.]?\d){7,8}$/,
                    "BY": /^((00 ?|\+)375 ?|0)?([ \-.]?\d){9}$/,
                    "CA": /^((00 ?|\+)1 ?|1)?([ \-.]?\d){10}$/,
                    "CH": /^((00 ?|\+)41 ?|0)?([ \-.]?\d){9}$/,
                    "CN": /^((00 ?|\+)86 ?|0)?([ \-.]?\d){10}$/,
                    "CZ": /^((00 ?|\+)420 ?)?([ \-.]?\d){9}$/,
                    "DE": /^((00 ?|\+)49 ?|0)?([ \-.]?\d){7,11}$/,
                    "DK": /^((00 ?|\+)45 ?)?([ \-.]?\d){8}$/,
                    "DZ": /^((00 ?|\+)213 ?|0)?([ \-.]?\d){9}$/,
                    "EE": /^((00 ?|\+)372 ?)?([ \-.]?\d){7}$/,
                    "ES": /^((00 ?|\+)34 ?)?([ \-.]?\d){9}$/,
                    "FI": /^((00 ?|\+)358 ?|0)?([ \-.]?\d){5,11}$/,
                    "FR": /^((00 ?|\+)33 ?|0)[1-79]([ \-.]?\d){8}$/,
                    "GB": /^((00 ?|\+)44 ?|0)?([ \-.]?\d){7,10}$/,
                    "GR": /^((00 ?|\+)30 ?)?([ \-.]?\d){10}$/,
                    "HR": /^((00 ?|\+)385 ?|0)?([ \-.]?\d){9}$/,
                    "HU": /^((00 ?|\+)36 ?|06)?([ \-.]?\d){8}$/,
                    "IE": /^((00 ?|\+)353 ?|0)?([ \-.]?\d){9}$/,
                    "IN": /^((00 ?|\+)91 ?|0)?([ \-.]?\d){10}$/,
                    "IT": /^((00 ?|\+)39 ?|0)?([ \-.]?\d){9}$/,
                    "JP": /^((00 ?|\+)81 ?|0)?([ \-.]?\d){9}$/,
                    "LI": /^((00 ?|\+)423 ?)?([ \-.]?\d){7}$/,
                    "LT": /^((00 ?|\+)370 ?|0)?([ \-.]?\d){8}$/,
                    "LU": /^((00 ?|\+)352 ?)?([ \-.]?\d){6,8}$/,
                    "LV": /^((00 ?|\+)371 ?)?([ \-.]?\d){8}$/,
                    "MA": /^((00 ?|\+)212 ?|0)?([ \-.]?\d){9}$/,
                    "MD": /^((00 ?|\+)373 ?|0)?([ \-.]?\d){8}$/,
                    "ME": /^((00 ?|\+)382 ?|0)?([ \-.]?\d){8}$/,
                    "MK": /^((00 ?|\+)389 ?|0)?([ \-.]?\d){8}$/,
                    "NL": /^((00 ?|\+)31 ?|0)?([ \-.]?\d){9}$/,
                    "NO": /^((00 ?|\+)47 ?)?([ \-.]?\d){8}$/,
                    "PL": /^((00 ?|\+)48 ?)?([ \-.]?\d){9}$/,
                    "PT": /^((00 ?|\+)351 ?)?([ \-.]?\d){9}$/,
                    "RO": /^((00 ?|\+)40 ?|0)?([ \-.]?\d){9}$/,
                    "RS": /^((00 ?|\+)381 ?|0)?([ \-.]?\d){9}$/,
                    "RU": /^((00 ?|\+)7 ?|8)?([ \-.]?\d){10}$/,
                    "SE": /^((00 ?|\+)46 ?|0)?([ \-.]?\d){6,10}$/,
                    "SI": /^((00 ?|\+)386 ?|0)?([ \-.]?\d){8}$/,
                    "SK": /^((00 ?|\+)421 ?|0)?([ \-.]?\d){9}$/,
                    "TN": /^((00 ?|\+)216 ?)?([ \-.]?\d){8}$/,
                    "TR": /^((00 ?|\+)90 ?|0)?([ \-.]?\d){10}$/,
                    "UA": /^((00 ?|\+)380 ?|0)?([ \-.]?\d){9}$/,
                    "US": /^((00 ?|\+)1 ?|1)?([ \-.]?\d){10}$/
                }
            },

            /* --------------------------------- Sécurité sociale --------------------------------- */

            ssn: {
                extract: function (value) {
                    /// <summary>
                    /// Converti une chaine de caractères objet représentatif du n° de sécu.
                    /// </summary>
                    /// <param name="value">le numéro de sécu</param>
                    /// <returns>Un objet représentant un n° de sécu.</returns>
                    value = value ? value.toUpperCase() : value;
                    var regexp = /^([1-3])([0-9]{2})([0-9]{2})([0-9]{2}|2A|2B)([0-9]{3})([0-9]{3})([0-9]{2})$/g;

                    var result = regexp.exec(value);

                    if (result) {
                        return {
                            gender: result[1],
                            birthYear: result[2],
                            birthMonth: result[3],
                            department: result[4],
                            district: result[5],
                            increment: result[6],
                            key: result[7],
                            value: function () {
                                var dpt = this.department;
                                if (this.department == '2A') {
                                    dpt = '19';
                                } else if (this.department == '2B') {
                                    dpt = '18';
                                }
                                return this.gender + this.birthYear + this.birthMonth + dpt + this.district + this.increment;
                            }
                        };
                    }

                    return null;
                },

                validate: function (val) {
                    /// <summary>
                    /// Validation du format et de la clé d'un numéro de sécurité sociale.
                    /// Social Security number (SSN) = Numéro d'inscription au répertoire des personnes physiques (NIR)
                    /// </summary>
                    /// <param name="val">Le numéro de sécurité sociale </param>
                    /// <returns>True si le format et la clé est correcte, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var ssn = validation.ssn.extract(val);
                    if (!ssn) {
                        return false;
                    }
                    var modResult = ssn.value() % 97;

                    return (97 - modResult) == ssn.key;
                },

                validateBirthDate: function (val, birthDate, affiliated) {
                    /// <summary>
                    /// Validation du numéro sécurité sociale par rapport à l'année et mois de naissance.
                    /// Format date jj/mm/aaaa est requise.
                    /// Social Security number(SSN) = Numéro d'inscription au répertoire des personnes physiques(NIR)
                    /// </summary>
                    /// <param name="val">Le numéro de sécurité sociale </param>
                    /// <param name="birthDate">Date de naissance</param>
                    /// <param name="affiliated">Optionnel. True si le n° est rattaché à un autre. Dans ce cas, la validation passe toujours.</param>
                    /// <returns>True si l'année de naissance correspond avec la date l'année de naissance dans le NIR et false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val) || validation.utils.isEmptyValOrNaN(birthDate)) {
                        return true;
                    }

                    var ssn = validation.ssn.extract(val);
                    if (!ssn) {
                        return true;
                    }

                    // Si le n° secu est affilié, on ne peut pas valider la date de naissance
                    if (!!affiliated) {
                        return true;
                    }
                    var dateString = birthDate.split("/");
                    var birthMonth = dateString[1].substr(0, 2);
                    var birthYear = dateString[2].substr(2, 3);

                    if (birthYear != ssn.birthYear) {
                        return false;
                    }
                    if (birthMonth != ssn.birthMonth) {
                        // Le mois ne correspond pas. On vérifie le pseudo mois (31=janvier, ..., 42=décembre)
                        // et le mois fictif (20 à 30 et 50 à 99)
                        var pseudoMonth = parseInt(birthMonth, 10) + 30;
                        var hasPseudoMonth = pseudoMonth == ssn.birthMonth;
                        var hasFictitiousMonth = (ssn.birthMonth >= 20 && ssn.birthMonth <= 30) || (ssn.birthMonth >= 50 && ssn.birthMonth <= 99);
                        if (!hasPseudoMonth && !hasFictitiousMonth) {
                            return false;
                        }
                    }

                    return true;
                },

                validateGender: function (val, gender, affiliated, male, female, other) {
                    /// <summary>
                    /// Validation du numéro sécurité sociale par rapport au sexe.
                    /// Social Security number(SSN) = Numéro d'inscription au répertoire des personnes physiques(NIR)
                    /// </summary>
                    /// <param name="val">Le numéro de sécurité sociale </param>
                    /// <param name="gender">Le genre (par défaut, 'M' ou 'F')</param>
                    /// <param name="affiliated">Optionnel. True si le n° est rattaché à un autre. Dans ce cas, la validation passe toujours.</param>
                    /// <param name="male">Optionnel. Le code du genre masculin..</param>
                    /// <param name="female">Optionnel. Le code du genre féminin.</param>
                    /// <returns>True si le genre de la personne correspond avec le code dans le NIR et false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val) || validation.utils.isEmptyValOrNaN(gender)) {
                        return true;
                    }

                    // Si le n° secu est affilié, on ne peut pas valider la date de naissance
                    if (!!affiliated) {
                        return true;
                    }

                    var ssn = validation.ssn.extract(val);
                    if (!ssn) {
                        return true;
                    }

                    male = male || validation.configuration.ssn.male;
                    female = female || validation.configuration.ssn.female;
                    other = other || validation.configuration.ssn.other;
                    var ssnGender = null;
                    if (ssn.gender === '1') {
                        ssnGender = male;
                    } else if (ssn.gender === '2') {
                        ssnGender = female;
                    } else if (ssn.gender === '3') {
                        ssnGender = other;
                    }

                    return gender == ssnGender;
                }
            },

            /* --------------------------------- Date --------------------------------- */
            dates: {
                validate: function (value) {
                    /// <summary>
                    /// Valide qu'une chaine est dans un format date valide ('dd/MM/yyyy').
                    /// </summary>
                    /// <param name="value">La date à valider.</param>
                    /// <returns>True si la date est valide ; false sinon.</returns>
                    if (validation.utils.isEmptyValOrNaN(value)) {
                        return true;
                    }

                    if (validation.utils.isDate(value) || validatedate(value)) {
                        return true;
                    }

                    return false;
                },

                futureDate: function (date, dateToCompare, dateToCompareIncluded, days, months) {
                    /// <summary>
                    /// Valide qu'une date est future par rapport à une autre date.
                    /// </summary>
                    /// <param name="date">La date à valider.</param>
                    /// <param name="dateToCompare">Optionnel. La date à comparer. S'il n'est pas renseigné, la comparaison se fera par rapport à la date du jour.</param>
                    /// <param name="dateToCompareIncluded">Optionnel. True pour indiquer que la date comparée peut-être égale à celle de référence.</param>
                    /// <param name="days">Optionnel. Le nombre de jours d'écart dans le futur.</param>
                    /// <param name="months">Optionnel. Le nombre de mois d'écart dans le futur.</param>
                    /// <returns>True si la date est dans le futur ; false sinon.</returns>
                    if (validation.utils.isEmptyValOrNaN(date)) {
                        return true;
                    }
                    var testedDate = validation.utils.toDate(angular.copy(date));

                    if (!testedDate) {
                        return false;
                    }
                    days = parseInt(days, 10);
                    if (!!days) {
                        testedDate.setDate(testedDate.getDate() + days);
                    }
                    months = parseInt(months, 10);
                    if (!!months) {
                        testedDate.setMonth(testedDate.getMonth() + months);
                    }
                    var refDate;
                    if (!!dateToCompare) {
                        refDate = validation.utils.toDate(dateToCompare);
                    } else {
                        refDate = validation.configuration.dates.dateProvider();
                    }
                    if (!refDate) {
                        return true;
                    }
                    return dateToCompareIncluded ? testedDate >= refDate : testedDate > refDate;
                },

                pastDate: function (date, dateToCompare, dateToCompareIncluded, days, months) {
                    /// <summary>
                    /// Valide qu'une date est passée par rapport à une autre date.
                    /// </summary>
                    /// <param name="date">La date à valider.</param>
                    /// <param name="dateToCompare">Optionnel. La date à comparer. S'il n'est pas renseigné, la comparaison se fera par rapport à la date du jour.</param>
                    /// <param name="dateToCompareIncluded">Optionnel. True pour indiquer que la date comparée peut-être égale à celle de référence.</param>
                    /// <param name="days">Optionnel. Le nombre de jours d'écart dans le futur.</param>
                    /// <param name="months">Optionnel. Le nombre de mois d'écart dans le futur.</param>
                    /// <returns>True si la date est dans le passé ; false sinon.</returns>
                    if (validation.utils.isEmptyValOrNaN(date)) {
                        return true;
                    }
                    var testedDate = validation.utils.toDate(angular.copy(date));

                    if (!testedDate) {
                        return false;
                    }
                    days = parseInt(days, 10);
                    if (!!days) {
                        testedDate.setDate(testedDate.getDate() + days);
                    }
                    months = parseInt(months, 10);
                    if (!!months) {
                        testedDate.setMonth(testedDate.getMonth() + months);
                    }
                    var refDate;
                    if (!!dateToCompare) {
                        refDate = validation.utils.toDate(dateToCompare);
                    } else {
                        refDate = validation.configuration.dates.dateProvider();
                    }
                    if (!refDate) {
                        return true;
                    }
                    return dateToCompareIncluded ? testedDate <= refDate : testedDate < refDate;
                },

                birthdate: function (value) {
                    /// <summary>
                    /// Valide qu'une date est une date de naissance. Un date de naissance est une date qui se situe dans le passé.
                    /// </summary>
                    /// <param name="date">La date à valider.</param>
                    /// <returns>True si la date est une date de naissance ; false sinon.</returns>
                    var isDate = validation.dates.validate(value);
                    if (!isDate) {
                        return false;
                    }
                    return validation.dates.pastDate(value, undefined, false, -1) && validation.dates.futureDate(value, undefined, false, 0, -1560);
                },

                effectiveDate: function (value) {
                    /// <summary>
                    /// Valide qu'une date est une date d'effet. Un date d'effet est une date qui se situe dans le futur (dans la limite de 12 mois).
                    /// </summary>
                    /// <param name="date">La date à valider.</param>
                    /// <returns>True si la date est une date de naissance ; false sinon.</returns>
                    var isDate = validation.dates.validate(value);
                    if (!isDate) {
                        return false;
                    }
                    return validation.dates.futureDate(value, undefined, false, -1) && validation.dates.pastDate(value, undefined, false, 0, -12);
                }
            },

            /* --------------------------------- Code organisme payeur (code caisse) --------------------------------- */
            paymentAuthorityCode: {
                extract: function (value) {
                    /// <summary>
                    /// Converti une chaine de caractères objet représentatif du code organisme payeur.
                    /// </summary>
                    /// <param name="value">Le code organisme payeur</param>
                    /// <returns>Un objet représentant un code organisme payeur.</returns>
                    var regexp = /^([0-9]{2})([0-9]{2})([0-9]{1})([0-9]{4})$/;

                    var result = regexp.exec(value);

                    if (result) {
                        return {
                            code: result[1],
                            departement: result[2],
                            scheme: result[3],
                            entity: result[2] + result[3],
                            num: result[4]
                        };
                    }
                    return null;
                },

                validate: function (val) {
                    /// <summary>
                    /// Verifie le format d'un organisme payeur
                    /// </summary>
                    /// <param name="val">Le numéro d'organisme payeur</param>
                    /// <returns>True si le format du numéro d'organisme payeur est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var code = validation.paymentAuthorityCode.extract(val);
                    // Si on a pas d'extraction, la validation échoue
                    return !!code;
                },

                validateRegime: function (val, regime) {
                    /// <summary>
                    /// Verifie le numéro d'organisme payeur par rapport au regime
                    /// </summary>
                    /// <param name="val">Le numero d'organisme payeur</param>
                    /// <param name="regimeId">Code du regime</param>
                    /// <returns>True si le numero d'organisme payeur est valide, false sinon</returns>
                    throw Error("Validation non conforme.");

                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    var code = validation.paymentAuthorityCode.extract(val);
                    // Si on a pas d'extraction, la validation passe
                    if (!code) {
                        return true;
                    }

                    // TODO : Vérifier cette validation car elle ne semble par être correcte (Cf. projet N2G)
                    switch (regime) {
                        /* RG7.1 : Pour un régime "01-Sécurité Social", "02-Alsace Moselle" et "15-TNS Régime général" le n° de Caisse doit être de la forme "01<département>XXXX" où "département" est celui de l'adresse de souscripteur et XXXX un nombre quelconque. */
                    case '01':
                    //01-Sécurité Social
                    case '02':
                    //02-Alsace Moselle
                    case '15':
                        //15-TNS Régime général
                        if (code.scheme != '01') {
                            return false;
                        }
                        break;
                    /* RG7.2 : Pour un régime "05-Exploitant Agricole" le n° de Caisse doit être de la forme "02<département>XXXX" */
                    case '05':
                        //05-Exploitant Agricole                
                        if ((code.scheme != '02')) {
                            return false;
                        }
                        break;
                    /* RG7.4 : Pour un régime "14-Salarié Agricole"  le n° de Caisse doit être de la forme "02<département>XXXXX" et XXXX un nombre quelconque */
                    case '14':
                        //14-Salarié Agricole
                        if ((code.scheme != '02')) {
                            return false;
                        }
                        break;
                    /* RG7.3 : Pour un régime "03-TNS" le n° de Caisse doit être de la forme "03XXXXXXX" */
                    case '03':
                        //03-TNS
                        if (code.scheme != '03') {
                            return false;
                        }
                        break;
                    }

                    return true;
                },

                validateDepartment: function (val, department) {
                    /// <summary>
                    /// Verifie le numéro d'organisme payeur par rapport au code département
                    /// </summary>
                    /// <param name="val">numero d'organisme payeur</param>
                    /// <param name="regimeId">Département</param>
                    /// <returns>True si le numero d'organisme payeur est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var code = validation.paymentAuthorityCode.extract(val);
                    // Si on a pas d'extraction, la validation passe
                    if (!code) {
                        return true;
                    }

                    return code.departement === department;
                }
            },


            /* --------------------------------- Code Postal --------------------------------- */
            zipCode: {
                validate: function (val, countryCode) {
                    /// <summary>
                    /// Verifie si le format du code postal est correct
                    /// </summary>
                    /// <param name="val">code postal = Zip Code</param>
                    /// <returns>True si le code postal est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var codePays = countryCode || validation.configuration.zipCode.defaultCountry;
                    var regexp = validation.zipCode.getRegexForCountry(codePays);

                    if (regexp) {
                        return regexp.test(val);
                    }

                    return true;
                },

                getRegexForCountry: function (countryCode) {
                    return validation.zipCode.dictionary[countryCode];
                },

                dictionary: {
                    "AD": /^AD[0-9]{3}$/,
                    "AL": /^[0-9]{4}$/,
                    "AT": /^[0-9]{4}$/,
                    "AU": /^[0-9]{4}$/,
                    "BA": /^[0-9]{5}$/,
                    "BE": /^[0-9]{4}$/,
                    "BG": /^[0-9]{4}$/,
                    "BY": /^[0-9]{6}$/,
                    "CA": /^[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}$/,
                    "CH": /^[0-9]{4}$/,
                    "CN": /^[0-9]{6}$/,
                    "CZ": /^[0-9]{5}$/,
                    "DE": /^[0-9]{5}$/,
                    "DK": /^[0-9]{4}$/,
                    "DZ": /^[0-9]{5}$/,
                    "EE": /^[0-9]{5}$/,
                    "ES": /^[0-9]{5}$/,
                    "FI": /^[0-9]{5}$/,
                    "FR": /^[0-9]{5}$/,
                    "GB": /^[A-Z]{1}[0-9A-Z]{4}[0-9A-Z]{0,2}$/,
                    "GR": /^[0-9]{5}$/,
                    "HR": /^[0-9]{5}$/,
                    "HU": /^[0-9]{4}$/,
                    "IE": /^$/,
                    "IN": /^[0-9]{6}$/,
                    "IT": /^[0-9]{5}$/,
                    "JP": /^[0-9]{7}$/,
                    "LI": /^[0-9]{4}$/,
                    "LT": /^[0-9]{5}$/,
                    "LU": /^[0-9]{4}$/,
                    "LV": /^LV-[0-9]{4}$/,
                    "MA": /^[0-9]{5}$/,
                    "MD": /^[0-9]{4}$/,
                    "ME": /^[0-9]{5}$/,
                    "MK": /^[0-9]{4}$/,
                    "NL": /^[0-9]{4}[A-Z]{2}$/,
                    "NO": /^[0-9]{4}$/,
                    "PL": /^[0-9]{5}$/,
                    "PT": /^[0-9]{7}$/,
                    "RO": /^[0-9]{6}$/,
                    "RS": /^[0-9]{5}$/,
                    "RU": /^[0-9]{6}$/,
                    "SE": /^[0-9]{5}$/,
                    "SI": /^[0-9]{4}$/,
                    "SK": /^[0-9]{5}$/,
                    "TN": /^[0-9]{4}$/,
                    "TR": /^[0-9]{5}$/,
                    "UA": /^[0-9]{5}$/,
                    "US": /^[0-9]{5}$/
                }
            },

            /* --------------------------------- Contrat --------------------------------- */
            contractId: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format du contrat est correct.
                    /// Le format attendu est 12 chiffres.
                    /// </summary>
                    /// <param name="val">numéro du contrat</param>
                    /// <returns>True si le numéro du contrat est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexp = /^\d{12}$/;
                    return regexp.test(val);
                }
            },

            /* --------------------------------- Immatriculation --------------------------------- */
            registrationNumber: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format de l'immatriculation est correct (ancien ou nouveau modèle pour la France uniquement)
                    /// </summary>
                    /// <param name="val">numéro due l'immatriculation</param>
                    /// <returns>True si le numéro de l'immatriculation est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexpnew = /^[A-Z]{2}\d{3}[A-Z]{2}$/;
                    var regexpold = /^\d{2,4}[A-Z]{1,3}(\d{2}|2A|2B)$/;

                    val = val.replace(/-/g, '').replace(/\s/g, '');
                    return regexpnew.test(val) || regexpold.test(val);
                }
            },

            /* --------------------------------- Portefeuille --------------------------------- */
            portfolioCode: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format du code portefeuille est correct.
                    /// Le format attendu est 12 chiffres.
                    /// </summary>
                    /// <param name="val">code portefeuille</param>
                    /// <returns>True si le code portefeuille est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexp = /^\d{12}$/;
                    return regexp.test(val);
                }
            },

            /* --------------------------------- Souscripteur --------------------------------- */
            subscriberId: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format du numéro de souscripteur est correct
                    /// Le format attendu est 12 chiffres.
                    /// </summary>
                    /// <param name="val">Le numéro souscripteur</param>
                    /// <returns>True si le numéro souscripteur est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexp = /^\d{12}$/;
                    return regexp.test(val);
                }
            },

            /* --------------------------------- URL --------------------------------- */
            url: {
                validate: function (value) {
                    /// <summary>
                    /// Verifie si le format d'une URL est correct
                    /// </summary>
                    /// <param name="val">L'URL</param>
                    /// <returns>True si le l'URL est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(value)) {
                        return true;
                    }

                    var regexp = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
                    return regexp.test(value);
                }
            },

            /* --------------------------------- Carte de crédit --------------------------------- */
            creditCard: {
                validate: function (value) {
                    /// <summary>
                    /// Verifie si le format d'une carte bancaire est correct
                    /// </summary>
                    /// <param name="val">Le n° de carte</param>
                    /// <returns>True si le le n° de carte est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(value)) {
                        return true;
                    }

                    // accept only spaces, digits and dashes
                    if (/[^0-9 \-]+/.test(value)) {
                        return false;
                    }

                    value = value.replace(/\s+/g, '');
                    return validation.utils.checkLuhn(value);
                }
            },


            /* --------------------------------- SIREN --------------------------------- */
            siren: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format d'un SIREN est correct
                    /// Règles : http://fr.wikipedia.org/wiki/Code_Insee#Le_num.C3.A9ro_SIREN
                    /// </summary>
                    /// <param name="val">Le n° SIREN</param>
                    /// <returns>True si le le n° SIREN est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexp = /^\d{9}$/;

                    val = val.replace(/\s+/g, '');

                    if (regexp.test(val)) {
                        return validation.utils.checkLuhn(val);
                    }
                    return false;
                }
            },

            /* --------------------------------- SIRET --------------------------------- */
            siret: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si le format d'un SIRET est correct
                    /// Règles :  http://fr.wikipedia.org/wiki/Code_Insee#Le_num.C3.A9ro_SIRET
                    /// </summary>
                    /// <param name="val">Le n° SIRET</param>
                    /// <returns>True si le le n° SIRET est valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regexp = /^\d{14}$/;
                    val = val.replace(/\s+/g, '');
                    if (regexp.test(val)) {
                        return validation.utils.checkLuhn(val);
                    }
                    return false;
                }
            },

            /* --------------------------------- REQUIRED --------------------------------- */
            required: {
                validate: function (val) {
                    var stringTrimRegEx = /^\s+|\s+$/g,
                        testVal;

                    if (val === undefined || val === null) {
                        return false;
                    }

                    testVal = val;
                    if (typeof (val) === "string") {
                        testVal = val.replace(stringTrimRegEx, '');
                    }

                    return (testVal + '').length > 0;
                }
            },

            /* --------------------------------- MINLENGTH --------------------------------- */
            minLength: {
                validate: function (val, minLength) {
                    /// <summary>
                    /// Verifie si la longueur de la chaine de caractère est supérieure à la valeur définie
                    /// </summary>
                    /// <param name="val">La chaine de caractère</param>
                    /// <param name="minLength">la valeur définie</param>
                    /// <returns>True si la longueur de la chaine de caractère est supérieure à la valeur définie, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    return ((val + '').length) >= minLength;
                }
            },

            /* --------------------------------- MAXLENGTH --------------------------------- */
            maxLength: {
                validate: function (val, maxLength) {
                    /// <summary>
                    /// Verifie si la longueur de la chaine de caractère est inférieure à la valeur définie
                    /// </summary>
                    /// <param name="val">La chaine de caractère</param>
                    /// <param name="maxLength">la valeur définie</param>
                    /// <returns>True si la longueur de la chaine de caractère est inférieure à la valeur définie, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    return ((val + '').length) <= maxLength;
                }
            },

            /* --------------------------------- PATTERN --------------------------------- */
            pattern: {
                validate: function (val, regex) {
                    /// <summary>
                    /// Verifie si la chaine de caractère correspond à l'expression régulière.
                    /// </summary>
                    /// <param name="val">La chaine de caractère</param>
                    /// <param name="regex">la regex</param>
                    /// <returns>True si la chaine de caractère correspond à la regex, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    return regex.test(val.toString());
                }
            },

            /* --------------------------------- MIN --------------------------------- */
            min: {
                validate: function (val, param) {
                    /// <summary>
                    /// Verifie si la valeur de référence est  à la valeur saisie
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <param name="param">la valeur de référence</param>
                    /// <returns>True si la valeur de référence est inferieure à la valeur saisie, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    return parseFloat(val) >= parseFloat(param);
                }
            },

            /* --------------------------------- MAX --------------------------------- */
            max: {
                validate: function (val, param) {
                    /// <summary>
                    /// Verifie si la valeur de référence est supérieure à la valeur saisie
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <param name="param">la valeur de référence</param>
                    /// <returns>True si la valeur de référence est supérieure à la valeur saisie, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    return parseFloat(val) <= parseFloat(param);
                }
            },

            /* --------------------------------- Email --------------------------------- */
            email: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si la valeur saisie est une adresse email valide
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <returns>True si la valeur saisie est une adresse email valide, false sinon</returns>
                    if (validation.utils.isEmptyValOrNaN(val)) {
                        return true;
                    }

                    var regex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;

                    return regex.exec(val);
                },
                validateMessage: '.'
            },

            /* --------------------------------- Number --------------------------------- */
            number: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si la valeur saisie est un nombre
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <returns>True si la valeur saisie est un nombre, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    var regex = /^-?\d+([,.]\d+)?$/;
                    return regex.test(val != undefined && val.replace ? val.replace(/\s/g, "") : val);
                }
            },

            /* --------------------------------- Digit --------------------------------- */
            digit: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si la valeur saisie est un entier
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <returns>True si la valeur saisie est un entier, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    var regex = /^\d$/;

                    return regex.test(val);
                }
            },

            /* --------------------------------- Integer --------------------------------- */
            integer: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si la valeur saisie est un entier
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <returns>True si la valeur saisie est un entier, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    var regex = /^-?\d+$/;

                    return regex.test(val);
                }
            },

            /* --------------------------------- Unsigned integer --------------------------------- */
            unsignedInteger: {
                validate: function (val) {
                    /// <summary>
                    /// Verifie si la valeur saisie est un entier positif
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <returns>True si la valeur saisie est un entier positif, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    var regex = /^\d+$/;

                    return regex.test(val);
                }
            },

            /* --------------------------------- Equal --------------------------------- */
            equal: {
                validate: function (val, params) {
                    return val === params;
                }
            },

            /* --------------------------------- Not Equal --------------------------------- */
            notEqual: {
                validate: function (val, params) {
                    /// <summary>
                    /// Verifie si la valeur saisie et la valeur de référence sont différentes
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <param name="param">la valeur de référence</param>
                    /// <returns>True si la valeur saisie et la valeur de référence sont différentes, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    return val !== params;
                }
            },

            /* --------------------------------- Range --------------------------------- */
            range: {
                validate: function (val, min, max) {
                    /// <summary>
                    /// Verifie si la valeur saisie est comprise entre les 2 valeurs données
                    /// </summary>
                    /// <param name="val">la valeur saisie</param>
                    /// <param name="min">la valeur min</param>
                    /// <param name="max">la valeur max</param>
                    /// <returns>True si la valeur saisie est comprise entre les 2 valeurs données, false sinon</returns>
                    if (validation.utils.isEmptyVal(val)) {
                        return true;
                    }

                    if (!min || !max) {
                        throw Error("Impossible de vérifier si la valeur est dans les bornes");
                    }

                    return parseFloat(val) <= parseFloat(max) && parseFloat(val) >= parseFloat(min);
                }
            },

            normalize: {
                // Reformate une chaine qui a une structure proche d'une date en une chaine au format DD/MM/YYYY
                normalizeDate: function (value, centuryOffset) {
                    if (!value) {
                        return value;
                    }
                    value = validation.normalize.trim(value);
                    var valueToWrite = value.replace(/[\s-\.]/g, '/');
                    if (/^\d{1,2}\/\d{1,2}\/\d{1,4}$/.test(valueToWrite)) {
                        var values = valueToWrite.split('/');
                        var currentYear = values[2];
                        if (currentYear.length <= 2) {
                            centuryOffset = centuryOffset || 20;
                            var fullYear = validation.configuration.dates.dateProvider().getFullYear();
                            var previousCentury = (fullYear - 100).toString().substr(0, 2);
                            var referenceCentury = (fullYear + centuryOffset).toString().substr(0, 2);
                            var referenceYear = fullYear + centuryOffset - (Math.floor((fullYear + centuryOffset) / 100) * 100);
                            referenceYear = referenceYear > 100 ? referenceYear - 100 : referenceYear;
                            if (parseInt(currentYear, 10) > referenceYear) {
                                currentYear = previousCentury + validation.utils.padLeft(currentYear, 2, '0');
                            } else {
                                currentYear = referenceCentury + validation.utils.padLeft(currentYear, 2, '0');
                            }
                        }

                        valueToWrite = validation.utils.padLeft(values[0], 2, '0') + '/' + validation.utils.padLeft(values[1], 2, '0') + '/' + validation.utils.padLeft(currentYear, 4, '0');
                        return valueToWrite;
                    }
                    return value;
                },
                trim: function (value) {
                    if (!value || !value.trim) {
                        return value;
                    }
                    return value.trim();
                },
                padLeft: function (value, length, paddingChar, regex) {
                    if (!value) {
                        return value;
                    }
                    if (!!regex && !regex.test) {
                        return value;
                    }
                    if (!!regex && !regex.test(value)) {
                        return value;
                    }
                    paddingChar = paddingChar || ' ';
                    return validation.utils.padLeft(value, length, paddingChar);
                },
                prune: function (value, length) {
                    if (!!value && value.substr && value.length > length) {
                        return value.substr(0, length);
                    }
                    return value;
                }
            },
            types: {
                firstname: {
                    validate: function (val) {
                        var result = {
                            valid: true,
                            message: ''
                        };
                        if (validation.utils.isEmptyVal(val)) {
                            return result;
                        }
                        var maxLength = 50;
                        if (!validation.maxLength.validate(val, maxLength)) {
                            result.valid = false;

                            result.message = validation.utils.formatMessage(validation.maxLength.validate.message, maxLength);
                            return result;
                        }
                        if (!validation.pattern.validate(val, /^[a-zâãäåæçèéêëìíîïðñòóôõøùúûüýþÿA-ZÂÃÄÅÆÇÈÉÊËÌÍÎÏİÐÑÒÓÔÕØÙÚÛÜÝÞŸ '-]*$/)) {
                            result.valid = false;
                            result.message = validation.pattern.validate.message;
                            return result;
                        }
                        return result;
                    }
                },
                lastname: {
                    validate: function (val) {
                        var result = {
                            valid: true,
                            message: ''
                        };
                        if (validation.utils.isEmptyVal(val)) {
                            return result;
                        }
                        var maxLength = 50;
                        if (!validation.maxLength.validate(val, maxLength)) {
                            result.valid = false;
                            result.message = validation.utils.formatMessage(validation.maxLength.validate.message, maxLength);
                            return result;
                        }
                        if (!validation.pattern.validate(val, /^[a-zâãäåæçèéêëìíîïðñòóôõøùúûüýþÿA-ZÂÃÄÅÆÇÈÉÊËÌÍÎÏİÐÑÒÓÔÕØÙÚÛÜÝÞŸ '-]*$/)) {
                            result.valid = false;
                            result.message = validation.pattern.validate.message;
                            return result;
                        }
                        return result;
                    }
                }
            },
            init: function () {
                validation.configuration.culture.setCulture(validation.configuration.culture.defaultCulture);

                /* Prototype */
                if (!String.prototype.trim) {
                    String.prototype.trim = function () {
                        return this.replace(/^\s*((?:[\S\s]*\S)?)\s*$/, '$1');
                    };
                }

                validation.bban.validate.message = 'Veuillez saisir un RIB valide.';
                validation.iban.validate.message = 'Veuillez saisir un IBAN valide.';
                validation.bic.validate.message = 'Veuillez saisir un BIC valide.';
                validation.phone.validate.message = 'Veuillez saisir un n° de téléphone valide.';
                validation.registrationNumber.validate.message = 'Veuillez saisir une immatriculation valide.';
                validation.ssn.validate.message = 'Veuillez saisir un n° de sécurité sociale valide.';
                validation.ssn.validateBirthDate.message = 'Veuillez saisir date de naissance valide';
                validation.ssn.validateGender.message = 'Veuillez saisir un n° de sécurité sociale et un sexe valide.';
                validation.dates.validate.message = 'Veuillez saisir une date valide.';
                validation.dates.futureDate.message = 'Veuillez saisir une date valide.';
                validation.dates.pastDate.message = 'Veuillez saisir une date valide.';
                validation.dates.birthdate.message = 'Veuillez saisir une date de naissance valide.';
                validation.dates.birthdate.messageBis = 'Veuillez saisir une date de naissance inférieure ou égale à la date d\'aujourd\'hui.';
                validation.dates.effectiveDate.message = 'Veuillez saisir une date d\'effet valide.';
                validation.paymentAuthorityCode.validate.message = 'Veuillez saisir un code d\'organisme payeur valide.';
                validation.paymentAuthorityCode.validateRegime.message = 'Veuillez saisir un code d\'organisme payeur et un régime valide.';
                validation.paymentAuthorityCode.validateDepartment.message = 'Veuillez saisir un code d\'organisme payeur et un département valide.';
                validation.zipCode.validate.message = 'Veuillez saisir un code postal valide.';
                validation.contractId.validate.message = 'Veuillez saisir un numéro de contrat valide.';
                validation.portfolioCode.validate.message = 'Veuillez saisir un code portefeuille valide.';
                validation.subscriberId.validate.message = 'Veuillez saisir un numéro d\'abonné valide.';
                validation.url.validate.message = 'Veuillez saisir une URL valide.';
                validation.creditCard.validate.message = 'Veuillez saisir un numéro de carte bancaire valide.';
                validation.siren.validate.message = 'Veuillez saisir un numéro SIREN valide.';
                validation.siret.validate.message = 'Veuillez saisir un numéro SIRET valide.';
                validation.required.validate.message = 'Ce champ est obligatoire.';
                validation.minLength.validate.message = 'Veuillez saisir au moins {0} caractère(s).';
                validation.maxLength.validate.message = 'Veuillez saisir au plus {0} caractère(s).';
                validation.pattern.validate.message = 'Veuillez corriger ce champ.';
                validation.min.validate.message = 'Veuillez saisir une valeur supérieure ou égale à {0}.';
                validation.max.validate.message = 'Veuillez saisir une valeur inférieure ou égale à {0}.';
                validation.email.validate.message = 'Veuillez saisir une adresse électronique valide.';
                validation.number.validate.message = 'Veuillez saisir un nombre.';
                validation.digit.validate.message = 'Veuillez saisir un chiffre.';
                validation.integer.validate.message = 'Veuillez saisir un entier.';
                validation.unsignedInteger.validate.message = 'Veuillez saisir un entier positif.';
                validation.equal.validate.message = 'Les valeurs doivent être égales.';
                validation.notEqual.validate.message = 'Veuillez saisir une autre valeur.';
                validation.range.validate.message = function (min, max) {
                    return 'Veuillez saisir une valeur entre ' + min + ' et ' + max;
                };
            }
        };
        validation.init();
        if (!Array.prototype.indexOf) {
            Array.prototype.indexOf = function (elt /*, from*/) {
                var len = this.length >>> 0;
                var from = Number(arguments[1]) || 0;
                from = (from < 0)
                    ? Math.ceil(from)
                    : Math.floor(from);
                if (from < 0)
                    from += len;

                for (; from < len; from++) {
                    if (from in this &&
                        this[from] === elt)
                        return from;
                }
                return -1;
            };
        }

        angular.validation = angular.validation || {};

        angular.validation.utils = {
            values: function (o) {
                var r = [];
                for (var i in o) {
                    if (o.hasOwnProperty(i)) {
                        r.push(o[i]);
                    }
                }
                return r;
            },
            isEmptyVal: function (val) {
                if (val === undefined) {
                    return true;
                }
                if (val === null) {
                    return true;
                }
                if (val === "") {
                    return true;
                }
                return false;
            },
            isNaN: function (val) {
                return typeof val === "number" && val !== val;
            },
            isEmptyValOrNaN: function (val) {
                return this.isEmptyVal(val) || this.isNaN(val);
            },
            isNumber: function (value) {
                return angular.isNumber(value);
            },
            getValue: function (o) {
                return validation.utils.getValue(o);
            },
            formatMessage: function (message, params) {
                if (angular.isFunction(message)) {
                    return message(params);
                }
                return message.replace(/\{0\}/gi, angular.validation.utils.getValue(params));
            }
        };
        if (!Array.prototype.indexOf) {
            Array.prototype.indexOf = function (elt /*, from*/) {
                var len = this.length >>> 0;
                var from = Number(arguments[1]) || 0;
                from = (from < 0)
                    ? Math.ceil(from)
                    : Math.floor(from);
                if (from < 0)
                    from += len;

                for (; from < len; from++) {
                    if (from in this &&
                        this[from] === elt)
                        return from;
                }
                return -1;
            };
        }

        /**
        *
        * @ngdoc object
        * @name angular.validation.rules
        * @description 
        * Contient l'ensemble des règles de validation
        */
        angular.validation.rules = {};
        /**
        *
        * @ngdoc object
        * @name angular.validation.types
        * @description 
        * Contient l'ensemble des types de validation
        */
        angular.validation.types = {};
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#required
        * @methodOf angular.validation.rules
        * @description 
        Définie un champ obligatoire
        */
        angular.validation.rules['required'] = {
            validator: function (val) {
                return validation.required.validate(val);
            },
            message: validation.required.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#min
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur saisie a pour mimimum la valeur de référence.
        
        Exemples fonctionnels :
        
        Référence : 30 – Saisie : 50
        Référence : 15.4 – Saisie : 24.87
        
        Exemples non-fonctionnels :
        
        Référence : 50 – Saisie : 10
        Référence : 61.9 – Saisie : 19.48
        * @example
        <doc:example module="minApp">
        <doc:source>
        <script>
        function MinCtrl($scope) {
        $scope.model = {
        minimumByValue : '24.87',
        rules : {
        minimumByValue: [{'min': {params : 15.4}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('minApp', ['afValidation']);
        </script>
        <form ng-controller="MinCtrl"class="form-horizontal">
        <div class="control-group" id="groupMin">
        <label class="control-label">Référence : 15.4</label>
        <div class="controls">
        <input type="text" class="input-mini" ng-model="model.minimumByValue" af-validate af-validate-decorate-element-id="groupMin" af-validate-error-placeholder-id="minErrorDisplay"/>
        <span class="help-inline placeholder" id="minErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['min'] = {
            validator: function (val, params) {
                var minValue = angular.validation.utils.getValue(val);
                var refValue = angular.validation.utils.getValue(params);

                return validation.min.validate(minValue, refValue);
            },
            message: validation.min.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#max
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur saisie a pour maximum la valeur de référence.
        
        Exemples fonctionnels :
        
        Référence : 80 – Saisie : 30
        Référence : 65.4 – Saisie : 54.87
        
        Exemples non-fonctionnels :
        
        Référence : 80 – Saisie : 100
        Référence : 65.4 – Saisie : 191.24
        * @example
        <doc:example module="maxApp">
        <doc:source>
        <script>
        function MaxCtrl($scope) {
        $scope.model = {
        maximumByValue : '3.14',
        rules : {
        maximumByValue: [{'max': {params: 80}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('maxApp', ['afValidation']);
        </script>
        <form ng-controller="MaxCtrl"class="form-horizontal">
        <div class="control-group" id="groupMax">
        <label class="control-label">Référence : 80</label>
        <div class="controls">
        <input type="text" class="input-mini" ng-model="model.maximumByValue" af-validate af-validate-decorate-element-id="groupMax" af-validate-error-placeholder-id="maxErrorDisplay"/>
        <span class="help-inline placeholder" id="maxErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['max'] = {
            validator: function (val, params) {
                var maxValue = angular.validation.utils.getValue(val);
                var refValue = angular.validation.utils.getValue(params);

                return validation.max.validate(maxValue, refValue);
            },
            message: validation.max.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#minLength
        * @methodOf angular.validation.rules
        * @description 
        Valide que la taille de la chaine de caratère saisie a pour minimum la valeur de référence.
        
        Exemples fonctionnels :
        
        Référence : 10 – Saisie : AXA Webcenter
        
        Exemples non-fonctionnels :
        
        Référence : 10 – Saisie : AXA
        * @example
        <doc:example module="minLengthApp">
        <doc:source>
        <script>
        function MinLengthCtrl($scope) {
        $scope.model = {
        tailleMinByValue : 'AXA Webcenter',
        rules : {
        tailleMinByValue: [{'minLength': {params : 10}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('minLengthApp', ['afValidation']);
        </script>
        <form ng-controller="MinLengthCtrl"class="form-horizontal">
        <div class="control-group" id="groupMinLength">
        <label class="control-label">Référence : 10</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.tailleMinByValue" af-validate af-validate-decorate-element-id="groupMinLength" af-validate-error-placeholder-id="minLengthErrorDisplay"/>
        <span class="help-inline placeholder" id="minLengthErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['minLength'] = {
            validator: function (val, minLength) {
                return validation.minLength.validate(val, angular.validation.utils.getValue(minLength));
            },
            message: validation.minLength.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#maxLength
        * @methodOf angular.validation.rules
        * @description 
        Valide que la taille de la chaine de caratère saisie a pour maximum la valeur de référence.
        
        Exemples fonctionnels :
        
        Référence : 20 – Saisie : AXA Webcenter
        
        Exemples non-fonctionnels :
        
        Référence : 20 – Saisie : AXA Webcenter Marcq-En-Baroeul
        * @example
        <doc:example module="maxLengthApp">
        <doc:source>
        <script>
        function MaxLengthCtrl($scope) {
        $scope.model = {
        tailleMaxByValue : 'AXA Webcenter',
        rules : {
        tailleMaxByValue: [{'maxLength': {params : 20}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('maxLengthApp', ['afValidation']);
        </script>
        <form ng-controller="MaxLengthCtrl" class="form-horizontal">
        <div class="control-group" id="groupMaxLength">
        <label class="control-label">Référence : 20</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.tailleMaxByValue" af-validate af-validate-decorate-element-id="groupMaxLength" af-validate-error-placeholder-id="maxLengthErrorDisplay"/>
        <span class="help-inline placeholder" id="maxLengthErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['maxLength'] = {
            validator: function (val, maxLength) {
                return validation.maxLength.validate(val, angular.validation.utils.getValue(maxLength));
            },
            message: validation.maxLength.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#pattern
        * @methodOf angular.validation.rules
        * @description 
        Valide que la chaine de caratère saisie correspond à l'expression régulière indiquée.
        
        Exemples fonctionnels :
        
        Référence : /^[a-z]*$/ – Saisie : axa
        
        Exemples non-fonctionnels :
        
        Référence : /^[a-z]*$/ – Saisie : AXA Webcenter
        * @example
        <doc:example module="patternApp">
        <doc:source>
        <script>
        function PatternCtrl($scope) {
        $scope.model = {
        testString : 'axa',
        rules : {
        testString: [{'pattern': {params : /^[a-z]*$/}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('patternApp', ['afValidation']);
        </script>
        <form ng-controller="PatternCtrl" class="form-horizontal">
        <div class="control-group" id="groupPattern">
        <label class="control-label">Référence : /^[a-z]*$/</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.testString" af-validate af-validate-decorate-element-id="groupPattern" af-validate-error-placeholder-id="patternErrorDisplay"/>
        <span class="help-inline placeholder" id="patternErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['pattern'] = {
            validator: function (val, regex) {
                return validation.pattern.validate(val, validation.utils.getValue(regex));
            },
            message: validation.pattern.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#email
        * @methodOf angular.validation.rules
        * @description
        Valide le format d'une adresse email selon la {@link http://tools.ietf.org/html/rfc3696 RFC 3696}.
        
        Format accepté : XXXXXX@YYYYY.ZZZZ
        
        XXXXXX - Chiffres, lettres et symboles autorisés, (le « . » et « @ » sont interdits comme 1er caractère)
        YYYYY - Chiffres, lettres et les symboles « . » et « _ » (interdits en 1er)
        ZZZZ - Chiffres et lettres (chiffres interdits en 1er et en dernier)
        
        « , » « ; » « : » « " » « (» « ) » « [» « ] » « \ » ne sont pas autorisés
        
        « @ » n’est autorisé une seule fois
        
        Exemples fonctionnels :
        
        Abc.def@axa.fr
        123abc@axa.fr
        abc_def@axa_intraxa.fr
        
        Exemples non-fonctionnels :
        
        .abc.def@axa.fr (point au début de l'adresse mail)
        Axa.fr (format invalide)
        Abc.def@axa@g.fr (plusieurs arobases interdits)
        Abc,def@axa.fr (virgule interdite)
        Abc.def@axa.123fr (chiffre interdit en premier après le second point)
        abc@123.axa2 (chiffre interdit en dernier après le second point)
        * @example
        <doc:example module="emailApp">
        <doc:source>
        <script>
        function EmailCtrl($scope) {
        $scope.model = {
        adresseMail : 'contact@axa.fr',
        rules : {
        adresseMail: ['email']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('emailApp', ['afValidation']);
        </script>
        <form ng-controller="EmailCtrl" class="form-horizontal">
        <div class="control-group" id="groupEmail">
        <label class="control-label">Email à saisir :</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.adresseMail" af-validate af-validate-decorate-element-id="groupEmail" af-validate-error-placeholder-id="emailErrorDisplay"/>
        <span class="help-inline placeholder" id="emailErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['email'] = {
            validator: function (val) {
                if (!val) {
                    return true;
                }

                return validation.email.validate(val);
            },
            message: validation.email.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#number
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur est un nombre décimal avec pour séparateur de décimale le « . ».
        
        Exemples fonctionnels :
        
        123
        123.45
        0.1
        
        Exemples non-fonctionnels :
        
        132,45
        123.45.67
        * @example
        <doc:example module="numberApp">
        <doc:source>
        <script>
        function NumberCtrl($scope) {
        $scope.model = {
        decimal : '3.14',
        rules : {
        decimal: ['number']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('numberApp', ['afValidation']);
        </script>
        <form ng-controller="NumberCtrl" class="form-horizontal">
        <div class="control-group" id="groupNumber">
        <label class="control-label">Décimal à saisir :</label>
        <div class="controls">
        <input type="text" class="input-mini" ng-model="model.decimal" af-validate af-validate-decorate-element-id="groupNumber" af-validate-error-placeholder-id="numberErrorDisplay"/>
        <span class="help-inline placeholder" id="numberErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['number'] = {
            validator: function (value) {
                return validation.number.validate(value);
            },
            message: validation.number.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#digit
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur saisie est un chiffre.
        
        Exemples fonctionnels :
        
        1
        0
        
        Exemples non-fonctionnels :
        12
        123.45
        456,78
        * @example
        <doc:example module="digitApp">
        <doc:source>
        <script>
        function DigitCtrl($scope) {
        $scope.model = {
        chiffre : '1',
        rules : {
        entier: ['digit']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('digitApp', ['afValidation']);
        </script>
        <form ng-controller="DigitCtrl" class="form-horizontal">
        <div class="control-group" id="groupDigit">
        <label class="control-label">Entier à saisir :</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.chiffre" af-validate af-validate-decorate-element-id="groupDigit" af-validate-error-placeholder-id="digitErrorDisplay"/>
        <span class="help-inline placeholder" id="digitErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['digit'] = {
            validator: function (value) {
                return validation.digit.validate(value);
            },
            message: validation.digit.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#integer
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur saisie est un nombre entier.
        
        Exemples fonctionnels :
        
        123
        0
        -12
        
        Exemples non-fonctionnels :
        
        123.45
        456,78
        * @example
        <doc:example module="integerApp">
        <doc:source>
        <script>
        function IntegerCtrl($scope) {
        $scope.model = {
        entier : '132',
        rules : {
        entier: ['integer']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('integerApp', ['afValidation']);
        </script>
        <form ng-controller="IntegerCtrl" class="form-horizontal">
        <div class="control-group" id="integerDigit">
        <label class="control-label">Entier à saisir :</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.entier" af-validate af-validate-decorate-element-id="groupDigit" af-validate-error-placeholder-id="integerErrorDisplay"/>
        <span class="help-inline placeholder" id="integerErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['integer'] = {
            validator: function (value) {
                return validation.integer.validate(value);
            },
            message: validation.integer.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#unsignedInteger
        * @methodOf angular.validation.rules
        * @description 
        Valide que la valeur saisie est un nombre entier positif.
        
        Exemples fonctionnels :
        
        123
        0
        
        Exemples non-fonctionnels :
        -1
        123.45
        456,78
        * @example
        <doc:example module="unsignedIntegerApp">
        <doc:source>
        <script>
        function UnsignedIntegerCtrl($scope) {
        $scope.model = {
        entier : '132',
        rules : {
        entier: ['unsignedInteger']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('unsignedIntegerApp', ['afValidation']);
        </script>
        <form ng-controller="UnsignedIntegerCtrl" class="form-horizontal">
        <div class="control-group" id="groupUnsignedInteger">
        <label class="control-label">Entier positif à saisir :</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.entier" af-validate af-validate-decorate-element-id="groupUnsignedInteger" af-validate-error-placeholder-id="unsignedIntegerErrorDisplay"/>
        <span class="help-inline placeholder" id="unsignedIntegerErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['unsignedInteger'] = {
            validator: function (value) {
                return validation.unsignedInteger.validate(value);
            },
            message: validation.unsignedInteger.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#equal
        * @methodOf angular.validation.rules
        *
        * @description 
        Valide que deux champs ont des valeurs égales.
        
        Exemples fonctionnels :
        
        Axa et Axa
        12 et 12
        
        Exemples non-fonctionnels :
        
        Axa et webcenter
        12 et 34
        *
        * @param {Object} val Valeur à évaluer.
        * @param {Object} params Valeur de référence.
        */
        angular.validation.rules['equal'] = {
            validator: function (val, params) {
                var equalValue = angular.validation.utils.getValue(val);
                var refValue = angular.validation.utils.getValue(params);

                return validation.equal.validate(equalValue, refValue);
            },
            message: validation.equal.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#notEqual
        * @methodOf angular.validation.rules
        * @param {Object} val Valeur à évaluer
        * @param {Object} params Valeur de référence
        * @description 
        Valide que deux champs ont des valeurs différentes.
        
        Exemples fonctionnels :
        
        Axa et webcenter
        12 et 34
        
        Exemples non-fonctionnels :
        
        Axa et Axa
        12 et 12
        * @example
        <doc:example module="notEqualApp">
        <doc:source>
        <script>
        function NotEqualCtrl($scope) {
        $scope.model = {
        differentFirstField : 'Axa',
        differentSecondField : 'Axa',
        rules : {
        differentSecondField: [{'notEqual': {
        params: function () { return self.differentFirstField; },
        dependencies: ['differentFirstField']
        }
        }]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('notEqualApp', ['afValidation']);
        </script>
        <form ng-controller="NotEqualCtrl" class="form-horizontal">
        <div class="control-group" id="groupNotEqual">
        <label class="control-label">1ère Valeur</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.differentFirstField" />
        </div>
        <label class="control-label">2nd Valeur</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.differentSecondField" af-validate af-validate-decorate-element-id="groupNotEqual" af-validate-error-placeholder-id="notEqualErrorDisplay"/>
        <span class="help-inline placeholder" id="notEqualErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        * 
        */
        angular.validation.rules['notEqual'] = {
            validator: function (val, params) {
                var notEqualValue = angular.validation.utils.getValue(val);
                var refValue = angular.validation.utils.getValue(params);

                return validation.notEqual.validate(notEqualValue, refValue);
            },
            message: validation.notEqual.validate.message
        };


        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#bban
        * @methodOf angular.validation.rules
        * @description 
        *  Valide le format et la clé d'un RIB.
        
        Format accepté : XXXXX YYYYY AAAAAAAAAAA BB
        
        XXXXX - 5 chiffres (code Banque) (peut être suivi d’un espace)
        YYYYY - 5 chiffres (code Guichet) (peut être suivi d’un espace)
        AAAAAAAAAAA - 11 chiffres et/ou lettres (Numéro de compte) (peut être suivi d’un espace)
        BB - 2 chiffres (clé RIB)
        
        Exemples fonctionnels :
        
        12548029980000000150086
        12548 02998 00000001500 86
        
        Exemples non-fonctionnels :
        
        12548 02998 00000001500 55 (clé incorrecte)
        12548 02998 00000001500 (format invalide)
        *
        * @example
        <doc:example module="bbanApp">
        <doc:source>
        <script>
        function BbanCtrl($scope) {
        $scope.model = {
        releveIdentiteBancaire : '12548 02998 00000001500 86',
        rules : {
        releveIdentiteBancaire: ['bban']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('bbanApp', ['afValidation']);
        </script>
        <form ng-controller="BbanCtrl" class="form-horizontal">
        <div class="control-group" id="groupbban">
        <label class="control-label">BBAN à tester</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.releveIdentiteBancaire" af-validate af-validate-decorate-element-id="groupbban" af-validate-error-placeholder-id="bbanErrorDisplay"/>
        <span class="help-inline placeholder" id="bbanErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['bban'] = {
            validator: function (val) {
                return validation.bban.validate(val);
            },
            message: validation.bban.validate.message
        };


        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#iban
        * @methodOf angular.validation.rules
        * @description 
        *  Valide le format d'un IBAN.
        
        Format accepté : XX YY AAAAAAAAAA...
        
        XX - 2 lettres (code Pays)
        YY - 2 chiffres (clef de contrôle)
        AAAAAAAAAA... - 10 à 30 chiffres et/ou lettres (BBAN)
        
        Exemples fonctionnels :
        
        FR7612548029980000000150086
        MT84MALT011000012345MTLCAST001S
        
        Exemples non-fonctionnels :
        
        127612548029980000000150086 (format invalide, 2 chiffres au début)
        * @example
        <doc:example module="ibanApp">
        <doc:source>
        <script>
        function IbanCtrl($scope) {
        $scope.model = {
        compteBancaireInternationale : 'UBSWCHZH80A BCEELULL',
        rules : {
        compteBancaireInternationale: ['iban']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('ibanApp', ['afValidation']);
        </script>
        <form ng-controller="IbanCtrl" class="form-horizontal">
        <div class="control-group" id="groupIban">
        <label class="control-label">IBAN à tester</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.compteBancaireInternationale" af-validate af-validate-decorate-element-id="groupIban" af-validate-error-placeholder-id="ibanErrorDisplay"/>
        <span class="help-inline placeholder" id="ibanErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['iban'] = {
            validator: function (val) {
                return validation.iban.validate(val);
            },
            message: validation.iban.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#bic
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d'un code BIC.
        
        Format accepté : XXXX YYY AA ou XXXX YYY AA BBB
        
        XXXX - 4 lettres (code Banque)
        YY - 2 lettres (code Pays)
        AA - 2 chiffres et/ou lettres (code Emplacement)
        BBB - 3 chiffres et/ou lettres non obligatoire (code Branche)
        
        Exemples fonctionnels :
        
        UBSWCHZH80A
        BCEELULL
        
        Exemples non-fonctionnels :
        
        12EELULL (format invalide)
        * @example
        <doc:example module="bicApp">
        <doc:source>
        <script>
        function BicCtrl($scope) {
        $scope.model = {
        bankIdentifierCode : 'UBSWCHZH80A',
        rules : {
        bankIdentifierCode: ['bic']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('bicApp', ['afValidation']);
        </script>
        <form ng-controller="BicCtrl" class="form-horizontal">
        <div class="control-group" id="groupBic">
        <label class="control-label">BIC à tester</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.bankIdentifierCode" af-validate af-validate-decorate-element-id="groupBic" af-validate-error-placeholder-id="bicErrorDisplay"/>
        <span class="help-inline placeholder" id="bicErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['bic'] = {
            validator: function (val) {
                return validation.bic.validate(val);
            },
            message: validation.bic.validate.message
        };


        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#ssn
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d'un numéro de sécurité sociale.
        
        Format accepté : XYYZZAABBBCCCDD
        
        X - 1 chiffre de 1 à 3 (genre)
        YY - 2 chiffres (année de naissance)
        ZZ - 2 chiffres (mois de naissance)
        AA - 2 chiffres ou 2A ou 2B (département)
        BBB - 3 chiffres (numéro d’ordre commune)
        CCC - 3 chiffres (numéro d’ordre d’acte de naissance)
        DD - 2 chiffres (clé)
        
        Exemples fonctionnels :
        
        180057500100168
        255081416802538
        380055911509587
        
        Exemples non-fonctionnels :
        
        1800575001001 (format invalide)
        480057500100168 (format invalide, 1er chiffre non valable)
        2-55-08-14-168-025-38 (format invalide, tirets interdits)
        3 80 05 59 115 095 87 (format invalide, espaces interdits)
        380055911509519 (clé incorrecte)
        * @example
        <doc:example module="ssnApp">
        <doc:source>
        <script>
        function SsnCtrl($scope) {
        $scope.model = {
        socialSecurityNumber : '180057500100168',
        rules : {
        socialSecurityNumber: ['ssn']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('ssnApp', ['afValidation']);
        </script>
        <form ng-controller="SsnCtrl" class="form-horizontal">
        <div class="control-group" id="groupSsn">
        <label class="control-label">Numéro de sécurité social à tester</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.socialSecurityNumber" af-validate af-validate-decorate-element-id="groupSsn" af-validate-error-placeholder-id="ssnErrorDisplay"/>
        <span class="help-inline placeholder" id="ssnErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * */
        angular.validation.rules['ssn'] = {
            validator: function (val) {
                return validation.ssn.validate(val);
            },
            message: validation.ssn.validate.message
        };
        angular.validation.rules['birthDate'] = {
            validator: function (val, params) {
                this.message = validation.dates.birthdate.message;
                var valid = angular.validation.rules['date'].validator(val, params), date;
                if (!valid) {
                    return false;
                }
                var current = new Date();
                if (angular.isString(val)) {
                    var slash = val.split('/'),
                        tiret = val.split('-');

                    if (slash.length > 1) {
                        date = new Date(slash.reverse().join('-'));
                    } else if (tiret.length > 1) {
                        date = new Date(val);
                    }
                    val = date;
                }
                valid = current >= val;
                if (!valid) {
                    this.message = validation.dates.birthdate.messageBis;
                    return false;
                }
                return true;
            },
            message: validation.dates.birthdate.message
        };
        angular.validation.rules['gender'] = {
            validator: function (val, params) {
                var gender = undefined,
                    affiliated = undefined,
                    male = undefined,
                    female = undefined,
                    other = undefined;
                if (!!params) {
                    gender = angular.validation.utils.getValue(params.gender);
                    affiliated = angular.validation.utils.getValue(params.affiliated);
                    male = angular.validation.utils.getValue(params.male);
                    female = angular.validation.utils.getValue(params.female);
                    other = angular.validation.utils.getValue(params.other);
                }
                if (!gender && typeof params !== "object") {
                    gender = angular.validation.utils.getValue(params);
                }
                return validation.ssn.validateGender(val, gender, affiliated, male, female, other);
            },
            message: validation.ssn.validateGender.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#date
        * @methodOf angular.validation.rules
        * @description 
        *  Valide le format et la validité d'une date.
        
        Le format de date peut être configuré par culture.
        
        Exemples fonctionnels :
        
        26/05/2013 pour un poste FR
        
        Exemples non-fonctionnels :
        
        05/26/2013 pour un poste FR
        * @example
        <doc:example module="dateApp">
        <doc:source>
        <script>
        function DateCtrl($scope) {
        $scope.model = {
        date : '26/05/2013',
        rules : {
        date: ['date']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('dateApp', ['afValidation']);
        </script>
        <form ng-controller="DateCtrl" class="form-horizontal">
        <div class="control-group" id="groupDate">
        <label class="control-label">Date à saisir :</label>
        <div class="controls">
        <div data-date-format="dd/mm/yyyy" class="input-append date">
        <input type="text" class="input-medium" ng-model="model.date" af-validate af-validate-decorate-element-id="groupDate" af-validate-error-placeholder-id="dateErrorDisplay"/>
        <span class="add-on"><i class="icon-axa axa-date"></i></span>
        </div>
        <span class="help-inline placeholder" id="dateErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * */
        angular.validation.rules['date'] = {
            validator: function (value, params) {
                return validation.dates.validate(value);
            },
            message: validation.dates.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#futureDate
        * @methodOf angular.validation.rules
        * @description 
        * Valide qu'une date saisie est postérieure à une date de référence.
        *
        * Sans date de référence, c'est la date du jour qui sera prise en compte.
        * 
        * Exemples fonctionnels :
        *
        *    Référence : 26/05/1986 – Indiqué : 26/05/2013
        *
        * Exemples non-fonctionnels :
        *
        *    Référence : 26/05/1986 – Indiqué : 01/01/1980
        * @example
        <doc:example module="futureDateApp">
        <doc:source>
        <script>
        function FutureDateCtrl($scope) {
        $scope.model = {
        dateFutureSaisie : '26/05/2013',
        rules : {
        dateFutureSaisie: [{'futureDate': {params : '26/05/1986'}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('futureDateApp', ['afValidation']);
        </script>
        <form ng-controller="FutureDateCtrl" class="form-horizontal">
        <div class="control-group" id="groupFutureDate">
        <label class="control-label">Date de référence : 26/05/2013</label>
        <div class="controls">
        <div data-date-format="dd/mm/yyyy" class="input-append date">
        <input type="text" class="input-medium" ng-model="model.dateFutureSaisie" af-validate af-validate-decorate-element-id="groupFutureDate" af-validate-error-placeholder-id="futureDateErrorDisplay"/>
        <span class="add-on"><i class="icon-axa axa-date"></i></span>
        </div>                        
        <span class="help-inline placeholder" id="futureDateErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['futureDate'] = {
            validator: function (val, params) {
                var date = null;
                var days = undefined;
                var months = undefined;
                var dateToCompareIncluded = false;

                if (typeof params === 'string' || validation.utils.isDate(params)) {
                    date = params;
                } else {
                    if (params.date) {
                        date = angular.validation.utils.getValue(params.date);
                    }
                    if (params.days) {
                        days = angular.validation.utils.getValue(params.days);
                    }
                    if (params.months) {
                        months = angular.validation.utils.getValue(params.months);
                    }
                    dateToCompareIncluded = params.dateIncluded && angular.validation.utils.getValue(params.dateIncluded);

                    if (!date) {
                        date = new Date();
                        date.setHours(0, 0, 0, 0);
                    }
                }
                return validation.dates.futureDate(val, date, dateToCompareIncluded, days, months);
            },
            message: validation.dates.futureDate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#pastDate
        * @methodOf angular.validation.rules
        * @description 
        * Valide qu'une date saisie est antérieure à une date de référence.
        *
        * Sans date de référence, c'est la date du jour qui sera prise en compte.
        *
        * Exemples fonctionnels :
        *
        *    Référence : 26/05/1986 – Indiqué : 26/05/1980
        *
        * Exemples non-fonctionnels :
        * 
        *     Référence : 26/05/1986 – Indiqué : 01/01/2014
        * @example
        <doc:example module="pastDateApp">
        <doc:source>
        <script>
        function PastDateCtrl($scope) {
        $scope.model = {
        datePasseeSaisie : '26/05/1980',
        rules : {
        datePasseeSaisie: [{'pastDate': {params : '26/05/1986'}}]
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('pastDateApp', ['afValidation']);
        </script>
        <form ng-controller="PastDateCtrl" class="form-horizontal">
        <div class="control-group" id="groupPastDate">
        <label class="control-label">Date de référence : 26/05/2013</label>
        <div class="controls">
        <div data-date-format="dd/mm/yyyy" class="input-append date">
        <input type="text" class="input-medium" ng-model="model.datePasseeSaisie" af-validate af-validate-decorate-element-id="groupPastDate" af-validate-error-placeholder-id="pastDateErrorDisplay"/>
        <span class="add-on"><i class="icon-axa axa-date"></i></span>
        </div>                        
        <span class="help-inline placeholder" id="pastDateErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['pastDate'] = {
            validator: function (val, params) {
                var date = null;
                var days = undefined;
                var months = undefined;
                var dateToCompareIncluded = false;

                if (typeof params === 'string' || validation.utils.isDate(params)) {
                    date = params;
                } else {
                    if (params.date) {
                        date = angular.validation.utils.getValue(params.date);
                    }
                    if (params.days) {
                        days = angular.validation.utils.getValue(params.days);
                    }
                    if (params.months) {
                        months = angular.validation.utils.getValue(params.months);
                    }
                    dateToCompareIncluded = params.dateIncluded && angular.validation.utils.getValue(params.dateIncluded);

                    if (!date) {
                        date = new Date();
                        date.setHours(0, 0, 0, 0);
                    }
                }
                return validation.dates.pastDate(val, date, dateToCompareIncluded, days, months);
            },
            message: validation.dates.pastDate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#paymentAuthorityCode
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d’un code caisse.
        * 
        * Format accepté : XX YY Z AAAA
        * 
        * XX - 2 chiffres (code)
        * YY - 2 chiffres (département)
        * Z - 1 chiffre (schéma)
        * AAAA - 4 chiffres (centre)
        * 
        * Le code « entité » qui est la concaténation du « département » et « schéma »
        * 
        * Exemples fonctionnels :
        * 
        * 015910000
        * 010110000
        * 
        * Exemples non-fonctionnels :
        * 
        * 0101 (format invalide)
        * 01591K000 (format invalide, lettre interdite)
        * @example
        <doc:example module="paymentAuthorityCodeApp">
        <doc:source>
        <script>
        function PaymentAuthorityCodeCtrl($scope) {
        $scope.model = {
        santeControllerValidation : '015910000',
        rules : {
        santeControllerValidation: ['paymentAuthorityCode']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('paymentAuthorityCodeApp', ['afValidation']);
        </script>
        <form ng-controller="PaymentAuthorityCodeCtrl" class="form-horizontal">
        <div class="control-group" id="groupPaymentAuthorityCode">
        <label class="control-label">Code caisse à tester</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.santeControllerValidation" af-validate af-validate-decorate-element-id="groupPaymentAuthorityCode" af-validate-error-placeholder-id="paymentAuthorityCodeErrorDisplay"/>
        <span class="help-inline placeholder" id="paymentAuthorityCodeErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['paymentAuthorityCode'] = {
            validator: function (val) {
                return validation.paymentAuthorityCode.validate(val);
            },
            message: validation.paymentAuthorityCode.validate.message
        };
        angular.validation.rules['paymentAuthorityCodeRegime'] = {
            validator: function (val, regime) {
                return validation.paymentAuthorityCode.validateRegime(val, regime);
            },
            message: validation.paymentAuthorityCode.validateRegime.message
        };
        angular.validation.rules['paymentAuthorityCodeDepartment'] = {
            validator: function (val, departmentCode) {
                return validation.paymentAuthorityCode.validateDepartment(val, departmentCode);
            },
            message: validation.paymentAuthorityCode.validateDepartment.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#phone
        * @methodOf angular.validation.rules
        * @description 
        * Valide si le format d'un numéro de téléphone français est correct.
        * 
        * Le format international est également accepté.
        * 
        * Exemples fonctionnels :
        * 
        * 00 33 123456789 (format international numérique avec séparateur)
        * 0033123456789 (format international numérique sans séparateur)
        * 0033 (0) 123456789 (format international numérique avec indicatif)
        * +33123456789 (format international standard)
        * +33 (0) 123456789 (format international standard avec indicatif)
        * 0123456789 (format national sans séparateur)
        * 01.23.45.67.89 (format national avec des points pour séparateur)
        * 01 23 45 67 89 (format national avec des espaces pour séparateur)
        * 01-23-45-67-89 (format national avec des tirets pour séparateur)
        * 
        * Exemples non-fonctionnels :
        * 
        * +3331245 (format invalide)
        * 33123456789 (format invalide, "+" manquant)
        * 0812345678 (08 interdit)
        * 01.23..45.67.89 (format invalide, 2 points pour séparateur)
        * 01.23.4.567.89 (format invalide, groupe de 2 chiffres non respecté hors indicatif)
        * @example
        <doc:example module="phoneApp">
        <doc:source>
        <script>
        function PhoneCtrl($scope) {
        $scope.model = {
        telephone : '132',
        rules : {
        telephone: ['phone']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('phoneApp', ['afValidation']);
        </script>
        <form ng-controller="PhoneCtrl" class="form-horizontal">
        <div class="control-group" id="groupPhone">
        <label class="control-label">Numéro de téléphone à saisir :</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.telephone" af-validate af-validate-decorate-element-id="groupPhone" af-validate-error-placeholder-id="phoneErrorDisplay"/>
        <span class="help-inline placeholder" id="phoneErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * */
        angular.validation.rules['phone'] = {
            validator: function (val, params) {
                var countriesValue = angular.validation.utils.getValue(params);

                return validation.phone.validate(val, countriesValue);
            },
            message: validation.phone.validate.message
        };

        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#zipCode
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d'un code postal international.
        * 
        * Les pays représentés sont les pays de l'Europe, les Etats-Unis, le Canada, le Maroc, l'Algérie, la Tunisie, le Japon, La Chine, l'Australie et l'Inde
        * 
        * La norme ISO 3166-1 est utilisé pour récupérer le format du code postal correspondant au pays (Ex: FR pour la France)
        * 
        * Si le pays n'est pas indiqué, la code postal français sera pris par défaut
        * 
        * Exemples fonctionnels :
        * 
        * 59000 pour un code postal français (5 chiffres)
        * A1B2C3 pour un code postal canadien (une lettre un chiffre (X3))
        * A1234B5 pour un code postal anglais (une lettre, 4 chiffres, 0 à 2 lettres ou chiffres)
        * 
        * @example
        <doc:example module="zipCodeApp">
        <doc:source>
        <script>
        function ZipCodeCtrl($scope) {
        $scope.model = {
        codePostal : '59000',
        rules : {
        codePostal: ['zipCode']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('zipCodeApp', ['afValidation']);
        </script>
        <form ng-controller="ZipCodeCtrl" class="form-horizontal">
        <div class="control-group" id="groupZipCode">
        <label class="control-label">Code postal à saisir :</label>
        <div class="controls">
        <input type="text" class="input-mini" ng-model="model.codePostal" af-validate af-validate-decorate-element-id="groupZipCode" af-validate-error-placeholder-id="zipCodeErrorDisplay"/>
        ///TODO : Ajouter la selection du pays
        <span class="help-inline placeholder" id="zipCodeErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['zipCode'] = {
            validator: function (val, params) {
                var countryValue = angular.validation.utils.getValue(params);

                return validation.zipCode.validate(val, countryValue);
            },
            message: validation.zipCode.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#contractId
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d’un numéro de contrat.
        * 
        * Format accepté : 0 à 12 chiffres
        * 
        * Exemples fonctionnels :
        * 
        *     123456789012
        *     9876543
        * 
        * Exemples non-fonctionnels :
        * 
        *     12345678r012 (format invalide, lettre interdite)
        * 
        * @example
        <doc:example module="contractIdApp">
        <doc:source>
        <script>
        function ContractIdCtrl($scope) {
        $scope.model = {
        contrat : '123456789012',
        rules : {
        contrat: ['contractId']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('contractIdApp', ['afValidation']);
        </script>
        <form ng-controller="ContractIdCtrl" class="form-horizontal">
        <div class="control-group" id="groupContractId">
        <label class="control-label">Numéro de contrat à saisir :</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.contrat" af-validate af-validate-decorate-element-id="groupContractId" af-validate-error-placeholder-id="contractIdErrorDisplay"/>
        <span class="help-inline placeholder" id="contractIdErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['contractId'] = {
            validator: function (val) {
                return validation.contractId.validate(val);
            },
            message: validation.contractId.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#portfolioCode
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d’un code portefeuille.
        * 
        * Format accepté : 12 chiffres
        * 
        * Exemples fonctionnels :
        * 
        *     123456789012
        *     987654321012
        * 
        * Exemples non-fonctionnels :
        * 
        *     123456789 (format invalide, chiffres manquants)
        *     12345678r012 (format invalide, lettre interdite)
        * 
        * @example
        <doc:example module="portfolioCodeApp">
        <doc:source>
        <script>
        function PortfolioCodeCtrl($scope) {
        $scope.model = {
        portefeuille : '123456789012',
        rules : {
        portefeuille: ['portfolioCode']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('portfolioCodeApp', ['afValidation']);
        </script>
        <form ng-controller="PortfolioCodeCtrl" class="form-horizontal">
        <div class="control-group" id="groupPortfolioCode">
        <label class="control-label">Code portefeuille à saisir :</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.portefeuille" af-validate af-validate-decorate-element-id="groupPortfolioCode" af-validate-error-placeholder-id="portfolioCodeErrorDisplay"/>
        <span class="help-inline placeholder" id="portfolioCodeErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['portfolioCode'] = {
            validator: function (val) {
                return validation.portfolioCode.validate(val);
            },
            message: validation.portfolioCode.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#subscriberId
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d’un numéro d'abonné.
        * 
        * Format accepté : 12 chiffres
        * 
        * Exemples fonctionnels :
        * 
        *     123456789012
        *     987654321012
        * 
        * Exemples non-fonctionnels :
        * 
        *     123456789 (format invalide, chiffres manquants)
        *     12345678r012 (format invalide, lettre interdite)
        * 
        * @example
        <doc:example module="subscriberIdApp">
        <doc:source>
        <script>
        function SubscriberIdCtrl($scope) {
        $scope.model = {
        abonne : '123456789012',
        rules : {
        abonne: ['subscriberId']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('subscriberIdApp', ['afValidation']);
        </script>
        <form ng-controller="SubscriberIdCtrl" class="form-horizontal">
        <div class="control-group" id="groupSubscriberId">
        <label class="control-label">Numéro d'abonné à saisir :</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.abonne" af-validate af-validate-decorate-element-id="groupSusbscriberId" af-validate-error-placeholder-id="subscriberIdErrorDisplay"/>
        <span class="help-inline placeholder" id="subscriberIdErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['subscriberId'] = {
            validator: function (val) {
                return validation.subscriberId.validate(val);
            },
            message: validation.subscriberId.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#url
        * @methodOf angular.validation.rules
        * @description 
        * Valide le format d'une URL selon la {@link http://tools.ietf.org/html/rfc3696 RFC 3696}.
        * 
        * Format accepté :
        * 
        *     http://XXXXXXX
        *     https://XXXXXXX
        *     ftp://XXXXXXX
        * 
        * XXXXXXX représente des chiffres, des lettres et les symboles suivants « . », « - », « _ », « ° », « £ », « µ », « § »
        * 
        * Exemples fonctionnels :
        * 
        *     http://www.axa.fr
        *     https://axa-fr.intraxa
        *     ftp://axa.com
        * 
        * Exemples non-fonctionnels :
        * 
        *     Axa://www.axa.fr (format invalide, ne commence pas par http, https ou ftp)
        *     https://axa,fr (format invalide, virgule non autorisé)
        *     ftp:/axa.fr (format invalide, ":/" non autorisé)
        * 
        * @example
        <doc:example module="urlApp">
        <doc:source>
        <script>
        function UrlCtrl($scope) {
        $scope.model = {
        lien : 'http://www.axa.fr',
        rules : {
        lien: ['url']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('urlApp', ['afValidation']);
        </script>
        <form ng-controller="UrlCtrl" class="form-horizontal">
        <div class="control-group" id="groupUrl">
        <label class="control-label">URL à saisir :</label>
        <div class="controls">
        <input type="text" class="input-large" ng-model="model.lien" af-validate af-validate-decorate-element-id="groupUrl" af-validate-error-placeholder-id="urlErrorDisplay"/>
        <span class="help-inline placeholder" id="urlErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['url'] = {
            validator: function (val) {
                return validation.url.validate(val);
            },
            message: validation.url.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#creditCard
        * @methodOf angular.validation.rules
        * @description 
        * ///TODO
        */
        angular.validation.rules['creditCard'] = {
            validator: function (val) {
                return validation.creditCard.validate(val);
            },
            message: validation.creditCard.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#siren
        * @methodOf angular.validation.rules
        * @description 
        * SIREN (Système d’Identification du Répertoire des ENtreprises)
        * --------------------------------------------------------------
        *
        * Valide un numéro SIREN par son format et grâce à {@link http://fr.wikipedia.org/wiki/Luhn l’algorithme de Luhn}.
        * 
        * Format accepté :
        * 
        *     9 chiffres
        * 
        * Exemples fonctionnels :
        * 
        *     732829320
        * 
        * Exemples non-fonctionnels :
        * 
        *     73282932 (format invalide)
        *     732829324 (numéro invalide avec l'algorithme de Luhn)
        * 
        * @example
        <doc:example module="sirenApp">
        <doc:source>
        <script>
        function SirenCtrl($scope) {
        $scope.model = {
        numeroSiren : '732829320',
        rules : {
        numeroSiren: ['siren']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('sirenApp', ['afValidation']);
        </script>
        <form ng-controller="SirenCtrl" class="form-horizontal">
        <div class="control-group" id="groupSiren">
        <label class="control-label">SIREN à saisir :</label>
        <div class="controls">
        <input type="text" class="input-small" ng-model="model.numeroSiren" af-validate af-validate-decorate-element-id="groupSiren" af-validate-error-placeholder-id="sirenErrorDisplay"/>
        <span class="help-inline placeholder" id="sirenErrorDisplay" />
        </div>
        </div>
        </form>
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['siren'] = {
            validator: function (val) {
                return validation.siren.validate(val);
            },
            message: validation.siren.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#siret
        * @methodOf angular.validation.rules
        * @description 
        * SIRET (Système d'Identification du Répertoire des ETablissements)
        * -----------------------------------------------------------------
        * 
        * Valide un numéro SIRET par son format et grâce à {@link http://fr.wikipedia.org/wiki/Luhn l’algorithme de Luhn}.
        * 
        * Format accepté :
        * 
        *     14 chiffres
        * 
        * Exemples fonctionnels :
        * 
        *     40483304800022
        * 
        * Exemples non-fonctionnels :
        * 
        *     404833048 (format invalide)
        *     40483304800028 (numéro invalide avec l'algorithme de Luhn)
        * 
        * @example
        <doc:example module="siretApp">
        <doc:source>
        <script>
        function SiretCtrl($scope) {
        $scope.model = {
        numeroSiret : '40483304800022',
        rules : {
        numeroSiret: ['siret']
        }
        };
        angular.validation.apply($scope, $scope.model);
        };
        var app = angular.module('siretApp', ['afValidation']);
        </script>
        <form ng-controller="SiretCtrl" class="form-horizontal">
        <div class="control-group" id="groupSiret">
        <label class="control-label">SIRET à saisir :</label>
        <div class="controls">
        <input type="text" class="input-medium" ng-model="model.numeroSiret" af-validate af-validate-decorate-element-id="groupSiret" af-validate-error-placeholder-id="siretErrorDisplay"/>
        <span class="help-inline placeholder" id="siretErrorDisplay" />
        </div>
        </div>
        </form>    
        </doc:source>
        </doc:example>
        * 
        */
        angular.validation.rules['siret'] = {
            validator: function (val) {
                return validation.siret.validate(val);
            },
            message: validation.siret.validate.message
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.rules#range
        * @methodOf angular.validation.rules
        * @description 
        * ///TODO
        */
        angular.validation.rules['range'] = {
            validator: function (val, params) {
                var minValue = angular.validation.utils.getValue(params.min);
                var maxValue = angular.validation.utils.getValue(params.max);

                return validation.range.validate(val, minValue, maxValue);
            },
            message: function (params) {
                var minValue = angular.validation.utils.getValue(params.min);
                var maxValue = angular.validation.utils.getValue(params.max);

                return validation.range.validate.message(minValue, maxValue);
            }
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.types#firstname
        * @methodOf angular.validation.types
        * @description 
        * ///TODO
        */
        angular.validation.types['firstname'] = {
            validator: function (value) {
                var result = validation.types.firstname.validate(value);
                this.message = result.message;
                return result.valid;
            },
            message: ''
        };
        /**
        *
        * @ngdoc method
        * @name angular.validation.types#lastname
        * @methodOf angular.validation.types
        * @description 
        * ///TODO
        */
        angular.validation.types['lastname'] = {
            validator: function (value) {
                var result = validation.types.lastname.validate(value);
                this.message = result.message;
                return result.valid;
            },
            message: ''
        };
        angular.validation.get = function (name) {
            var rule = angular.validation.rules[name];
            if (rule) {
                return rule;
            }
            rule = angular.validation.types[name];
            if (rule) {
                return rule;
            }
            throw new Error('la regle: ' + name + ' n\'existe pas');
        };

        var provider = function () {
            var $this = this;
            var config = {
                validOn: 'lostFocus',
                showMessageOnInit: false,
                placeholderClass: {
                    error: 'help-inline',
                    state: 'icon-axa axa-valid'
                },
                errorClass: 'error',
                successClass: 'succes',
                validatingClass: 'validating',
                errorTemplate: function () {
                    return '<af-error-placeholder class="' + config.placeholderClass.error + '"></af-error-placeholder>';
                },
                stateTemplate: function () {
                    return '<af-validation-state class="' + config.placeholderClass.state + '"></af-validation-state>';
                }
            };
            $this.config = config;
            
            $this.$get = [
                '$rootScope', '$http', '$q',
                function ($rootScope, $http, $q) {
                    var $scope = $rootScope.$new();

                    function eachValidatable(fn) {
                        for (var ruleProp in service.validatableProperties) {
                            var propertyValidable = service.validatableProperties[ruleProp];
                            if (propertyValidable && propertyValidable.validate) {
                                if (angular.isFunction(fn)) {
                                    fn(propertyValidable);
                                }
                            }
                        }
                    }

                    function hideMessage(groupName) {
                        eachValidatable(function (item) {
                            if (angular.isUndefined(groupName) || item[keys.validationGroup] === groupName) {
                            item.showMessage = false;
                    }
                        });
                    };

                    function showMessage(groupName) {
                        eachValidatable(function (item) {
                            if (angular.isUndefined(groupName) || item[keys.validationGroup] === groupName) {
                            item.showMessage = true;
                            }
                        });
                    };

                    function isValid() {
                        // ReSharper disable once UnusedLocals
                        for (var error in service.errors) {
                            return false;
                        }
                        return true;
                    }

                    function validate() {
                        for (var error in service.errors) {
                            delete service.errors[error];
                        }
                        var promises = [];
                        eachValidatable(function (item) {
                            item.showMessage = true;
                            var result = item.validate();
                            if (angular.isDefined(result.then)) {
                                promises.push(result);
                            }
                        });
                        return $q.all(promises).then(function () {
                            if (window.jasmine || window.mocha) {
                                return true;
                            }

                            if (service.isValid()) {
                                return true;
                            }


                            return $q.reject(service.isValid());
                        });
                    }

                    function validateGroup(groupName) {
                        var result = {
                            nbError: 0,
                            errors: [],
                            isValid: function () {
                                return result.nbError == 0;
                            }
                        };
                        var promises = [];
                        eachValidatable(function (item) {
                            if (item.hasOwnProperty('validationGroup') && item.validationGroup == groupName) {
                                item.showMessage = true;
                                var validateResult = item.validate();
                                if (angular.isDefined(validateResult.then)) {
                                    promises.push(validateResult);
                                    validateResult.then(function (valid) {
                                        if (!valid) {
                                            result.nbError++;
                                            result.errors.push(item.error.message);
                                        }
                                    });

                                } else {
                                    if (!item.isValid()) {
                                        result.nbError++;
                                        result.errors.push(item.error.message);
                                    }
                                }
                            }
                        });
                        return $q.all(promises).then(function () {
                            if (result.isValid()) {
                                return true;
                            }
                            return $q.reject(service.isValid());
                        });
                    }

                    function enable(propertyName, ruleName) {
                        var property = service.validatableProperties[propertyName];
                        if (angular.isUndefined(property)) {
                            throw Error("La propriété " + propertyName + 'n\'existe pas.');
                        }
                        if (angular.isDefined(ruleName) && angular.isUndefined(property[ruleName])) {
                            throw Error("La regle " + ruleName + 'n\'existe pas sur la propriété ' + propertyName);
                        }
                        if (angular.isUndefined(ruleName)) {
                            property.enable();
                        } else {
                            if (ruleName === 'required' || angular.isDefined(property.isRequired)) {
                                property.isRequired = true;
                            }
                            property[ruleName].enable();
                        }
                    };

                    function disable(propertyName, ruleName) {
                        var property = service.validatableProperties[propertyName];
                        if (angular.isUndefined(property)) {
                            throw Error("La propriété " + propertyName + 'n\'existe pas.');
                        }
                        if (angular.isDefined(ruleName) && angular.isUndefined(property[ruleName])) {
                            throw Error("La regle " + ruleName + 'n\'existe pas sur la propriété ' + propertyName);
                        }
                        if (angular.isUndefined(ruleName)) {
                            property.disable();
                        } else {
                            if (ruleName === 'required' || angular.isDefined(property.isRequired)) {
                                property.isRequired = false;
                            }
                            property[ruleName].disable();
                        }
                    };

                    function apply(scope, model) {
                        initialize();
                        if (angular.isUndefined(model)) {
                            throw Error('Le model ne peut-être null');
                        }

                        if (window.jasmine || window.mocha) {
                            modelValue = model;
                            $scope.modelValue = model;
                        }

                        service.currentModel = model;
                        var validatatable = [];

                        for (var property in scope) {
                            if (scope[property] === model) {
                                service.propertyNameBinding = property;
                                break;
                            }
                        }
                        if (angular.isArray(model)) {
                            listenArray(model);
                            angular.forEach(model, function (value, index) {
                                createValidatatable(value, validatatable, '[' + index + ']');
                            });
                        } else {
                            createValidatatable(model, validatatable);
                        }
                        for (var validationItem in validatatable) {
                            var validatableItem = [];
                            angular.copy(validatatable[validationItem], validatableItem);
                            for (var propertyName in validatatable[validationItem]) {
                                if (!isNaN(parseInt(propertyName))) {
                                    continue;
                                }

                                validatableItem[propertyName] = validatatable[validationItem][propertyName];
                            }
                            validatatable[validationItem].property = validationItem;
                            service.validatableProperties[validationItem] = validatableItem;
                        }
                        service.add(model, service.validatableProperties);

                        var errorForDelete = undefined;

                        angular.forEach(service.errors, function (value, propertyName) {
                            var propertyIsFound = false;
                            for (var ruleProperty in service.validatableProperties) {
                                if (ruleProperty == propertyName) {
                                    propertyIsFound = true;
                                    service.validatableProperties[ruleProperty].error.hasError = true;
                                    service.validatableProperties[ruleProperty].error.message = value.message;
                                    break;
                                }
                            }
                            if (!propertyIsFound) {
                                if (angular.isUndefined(errorForDelete)) {
                                    errorForDelete = {};
                                }
                                errorForDelete[propertyName] = value;
                            }
                        });

                        if (angular.isDefined(errorForDelete)) {
                            angular.forEach(errorForDelete, function (value, propertyName) {
                                delete service.errors[propertyName];
                            });
                        }
                        if (config.showMessageOnInit) {
                            service.showMessage();
                        } else {
                            service.hideMessage();
                        }
                    };

                    function removeElement(array, element) {
                        var index = array.indexOf(element);
                        if (index >= 0) {
                            array.splice(index, 1);
                        }
                    };

                    function remove(model, validationProperty) {
                        if (angular.isUndefined(model)) {
                            throw Error('Le model ne peut-être null');
                        }
                        if (angular.isUndefined(validationProperty)) {
                            throw Error('Les regles a supprimer ne peuvent être null.');
                        }
                        if (angular.isUndefined(service.validatableProperties)) {
                            throw Error('La collection de validation ne peut être vide, assurez-vous que la methode apply est été faite.');
                        }
                        for (var property in validationProperty) {
                            var validatableProperty = service.validatableProperties[property];
                            if ((angular.isFunction(model[property])) || angular.isFunction(validatableProperty)) {
                                continue;
                            }
                            angular.forEach(validatableProperty, function (value) {
                                removeElement(validatableProperty, value);
                                if (angular.isDefined(value['required']) || angular.isDefined(validatableProperty.isRequired)) {
                                    validatableProperty.isRequired = false;
                                }
                                delete validatableProperty[value];
                            });
                        }
                    }

                    function add(model, newValidationProperty) {
                        if (angular.isUndefined(model)) {
                            throw Error('Le model ne peut-être null');
                        }
                        if (angular.isUndefined(newValidationProperty)) {
                            throw Error('La nouvelle validation ne peut-être null');
                        }
                        if (angular.isUndefined(service.validatableProperties)) {
                            throw Error('La collection de validation ne peut être vide, assurez-vous que apply est été faite.');
                        }

                        for (var property in newValidationProperty) {
                            var ruleIndex, ruleItemProperty;
                            var validatableProperty = newValidationProperty[property];
                            if ((model && angular.isFunction(model[property])) || angular.isFunction(validatableProperty)) {
                                continue;
                            }
                            if (angular.isDefined(validatableProperty)) {
                                if (service.validatableProperties[property] && (service.validatableProperties[property] !== validatableProperty)) {
                                    angular.forEach(validatableProperty, function (value) {
                                        service.validatableProperties[property].push(value);
                                        validatableProperty = service.validatableProperties[property];
                                    });
                                } else {
                                    service.validatableProperties[property] = validatableProperty;
                                }
                                validatableProperty.dependencyProperties = [];
                                validatableProperty.property = property;
                                validatableProperty.isConditioned = validatableProperty.hasOwnProperty('isConditioned') ? validatableProperty.isConditioned : false;
                                validatableProperty.enableChange = validatableProperty.hasOwnProperty('enableChange') ? validatableProperty.enableChange : true;
                                validatableProperty.enable = function () {
                                    var change = false;
                                    for (ruleIndex = 0; ruleIndex < this.length; ruleIndex++) {
                                        var ruleName = this[ruleIndex];
                                        ruleItemProperty = this[ruleName];
                                        if (angular.isObject(ruleName)) {
                                            angular.forEach(ruleName, function (value, index) {
                                                ruleName = index;
                                                ruleItemProperty = value;
                                            });
                                        }
                                        if (ruleItemProperty.enable) {
                                            if (ruleItemProperty.isEnabled == false) {
                                                if (ruleName === 'required' || angular.isDefined(ruleItemProperty.isRequired)) {
                                                    this.isRequired = true;
                                                }
                                                ruleItemProperty.enable();
                                                change = true;
                                            }
                                        }
                                    }
                                    if (change && this.enableChange == false) {
                                        this.enableChange = true;
                                    }
                                };
                                validatableProperty.disable = function () {
                                    var change = true;
                                    for (ruleIndex = 0; ruleIndex < this.length; ruleIndex++) {
                                        var ruleName = this[ruleIndex];
                                        ruleItemProperty = this[ruleName];
                                        if (angular.isObject(ruleName)) {
                                            angular.forEach(ruleName, function (value, index) {
                                                ruleName = index;
                                                ruleItemProperty = value;
                                            });
                                        }
                                        if (ruleItemProperty.disable) {
                                            if (ruleItemProperty.isEnabled == true) {
                                                if (ruleName === 'required' || angular.isDefined(ruleItemProperty.isRequired)) {
                                                    this.isRequired = false;
                                                }
                                                ruleItemProperty.disable();
                                                change = false;
                                            }
                                        }
                                    }
                                    if (change == false && this.enableChange == true) {
                                        this.enableChange = false;
                                    }
                                };
                                for (ruleIndex = 0; ruleIndex < validatableProperty.length; ruleIndex++) {
                                    var ruleNameIndex = validatableProperty[ruleIndex];
                                    ruleItemProperty = validatableProperty[ruleNameIndex];
                                    if (!ruleNameIndex || angular.isFunction(ruleNameIndex) || angular.isArray(ruleNameIndex) || ruleNameIndex === 'isConditioned'
                                        || ruleNameIndex === 'dependencyRule' || ruleNameIndex.hasOwnProperty('validator')
                                        || validatableProperty.validate && ruleItemProperty && ruleItemProperty.hasOwnProperty('validator')) {
                                        continue;
                                    }

                                    if (angular.isObject(ruleNameIndex)) {
                                        angular.forEach(ruleNameIndex, function (value, index) {
                                            ruleNameIndex = index;
                                            ruleItemProperty = value;
                                        });
                                    }
                                    if (validatableProperty[ruleNameIndex] !== undefined) {
                                        continue;
                                    }

                                    ruleItemProperty = ruleItemProperty ? ruleItemProperty : {};
                                    validatableProperty[ruleNameIndex] = ruleItemProperty;
                                    if (ruleNameIndex == keys.validationGroup) {
                                        continue;
                                    }

                                    ruleItemProperty.isEnabled = ruleItemProperty.enabled !== undefined ? ruleItemProperty.enabled : true;

                                    ruleItemProperty.enable = function () {
                                        this.isEnabled = true;
                                    };
                                    ruleItemProperty.disable = function () {
                                        this.isEnabled = false;
                                    };
                                    var rule = undefined;
                                    validatableProperty.validating = false;
                                    if (angular.isUndefined(validatableProperty.isRequired) || validatableProperty.isRequired === false) {
                                        validatableProperty.isRequired = ruleNameIndex === 'required';
                                    }
                                    if (ruleNameIndex !== 'async') {
                                        validatableProperty.isAsync = false;
                                        rule = angular.validation.get(ruleNameIndex);
                                        if (!rule) {
                                            throw new Error('la regle: ' + name + ' n\'existe pas');
                                        }
                                        if (angular.isDefined(rule.isRequired)) {
                                            validatableProperty.isRequired = rule.isRequired;
                                        }
                                    } else {
                                        rule = {
                                            validator: function (value) {
                                                var data = this.data, headers = this.headers;
                                                if (angular.isUndefined(data) || !angular.isFunction(data)) {
                                                    throw Error('funtion data doit être renseignée');
                                                    }

                                                //if (angular.isUndefined(headers)) {
                                                //    headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' };
                                                //}

                                                return $http({
                                                    method: 'POST',
                                                    url: this.url,
                                                    data: data(value),
                                                    headers: headers
                                                });
                                            },
                                            message: ''
                                        }
                                        validatableProperty.isAsync = true;

                                    }
                                    if (!ruleItemProperty.hasOwnProperty('validator')) {
                                        ruleItemProperty.validator = rule.validator;
                                    }
                                    if (!ruleItemProperty.hasOwnProperty('message')) {
                                        ruleItemProperty.message = rule.message;
                                    }

                                    if (ruleItemProperty.hasOwnProperty('onlyIf')) {
                                        validatableProperty.isConditioned = true;
                                    }

                                    if (ruleItemProperty.hasOwnProperty('dependencies')) {
                                        for (var depIndex = 0; depIndex < ruleItemProperty.dependencies.length; depIndex++) {
                                            validatableProperty.dependencyProperties.push(ruleItemProperty.dependencies[depIndex]);
                                        }
                                        validatableProperty.hasDependency = true;
                                    }

                                }
                                validatableProperty.enableChange = validatableProperty.hasOwnProperty('wasValidated') ? validatableProperty.wasValidated : false;
                                validatableProperty.showMessage = validatableProperty.hasOwnProperty('showMessage') ? validatableProperty.showMessage : config.showMessageOnInit;
                                validatableProperty.error = {
                                    message: '',
                                    hasError: false
                                };

                                validatableProperty.isValid = function () {
                                    return !this.error.hasError;
                                };

                                function validateProperty(currentProperty, currentValue, viewValue) {
                                    // Si NaN, alors la vue est initialisée mais la méchanique angular n'est pas encore prête
                                    if (viewValue !== viewValue) {
                                        return true;
                                    }

                                    var self = currentProperty;
                                    for (var indexRule = 0; indexRule < self.length; indexRule++) {
                                        var ruleName = self[indexRule];
                                        if (angular.isObject(ruleName)) {
                                            angular.forEach(ruleName, function (value, index) {
                                                ruleName = index;
                                            });
                                        }
                                        var currentRule = self[ruleName];
                                        if (currentRule && currentRule.validator !== undefined) {

                                            var canBeValidate = true;
                                            delete service.errors[self.property];
                                            if (!self.error.hasError) {
                                                if (currentRule.onlyIf) {
                                                    canBeValidate = currentRule.onlyIf();
                                                }
                                                if (canBeValidate && currentRule.isEnabled) {
                                                    self.wasValidated = true;
                                                    self.validating = self.isAsync;
                                                    var params = {
                                                        viewValue: viewValue
                                                    };

                                                    if (angular.isDefined(currentRule.params)) {
                                                        if (currentRule.params instanceof RegExp) {
                                                            params.value = currentRule.params;
                                                        } else if (angular.isObject(currentRule.params)) {
                                                            angular.extend(params, currentRule.params);
                                                        } else {
                                                            params.value = currentRule.params;
                                                        }
                                                    }

                                                    var validatorResult = currentRule.validator(currentValue, params);
                                                    if (angular.isObject(validatorResult) && angular.isDefined(validatorResult.then)) {
                                                        return validatorResult.then(function (result) {
                                                            self.validating = false;
                                                            self.error.message = '';
                                                            self.error.hasError = false;
                                                            self.error.type = '';
                                                            self.error.group = '';
                                                            self.ctrl().$setValidity('async', true);
                                                            delete service.errors[self.property];
                                                            if (currentRule.onSuccess) {
                                                                currentRule.onSuccess(result);
                                                            }
                                                            return true;
                                                        }, function (result) {
                                                            self.validating = false;
                                                            self.error.message = currentRule.getErrorMessage(result);
                                                            self.error.hasError = true;
                                                            self.error.type = 'async';
                                                            self.error.group = self[keys.validationGroup];;
                                                            self.ctrl().$setValidity('async', false);
                                                            service.errors[self.property] = {
                                                                type: ruleName,
                                                                message: self.error.message
                                                            };
                                                            return false;
                                                        });
                                                    } else {
                                                        var valid = validatorResult;
                                                        if (!valid && !self.error.hasError) {
                                                            self.error.message = angular.validation.utils.formatMessage(currentRule.message, currentRule.params);
                                                            self.error.hasError = true;
                                                            self.validating = false;
                                                            self.error.type = ruleName;
                                                            self.error.group = self[keys.validationGroup];
                                                        }
                                                    }
                                                }
                                            }
                                            self.ctrl().$setValidity(ruleName, !self.error.hasError);
                                            if (self.error.hasError) {
                                                service.errors[self.property] = {
                                                    type: ruleName,
                                                    message: self.error.message
                                                };
                                                return !self.error.hasError;
                                            }
                                        }
                                    }
                                    return !self.error.hasError;
                                }

                                validatableProperty.validate = function () {
                                    var self = this;
                                    this.wasValidated = false;
                                    this.error.hasError = false;

                                    if (window.jasmine || window.mocha) {
                                        // Mock
                                        self.ctrl = function () {
                                            var split = self.property.replace(/\[/g, '.').replace(/]/g, '').split('.'), value = modelValue;

                                            split.forEach(function (prop) {
                                                if (prop != "") {
                                                    try {
                                                        value = value[prop];
                                                    } catch (e) {
                                                        //console.log('modelValue : ' + angular.toJson(modelValue));
                                                        //console.log('self.property : ' + self.property);
                                                        //console.log('split : ' + split);
                                                        //console.log('value : ' + value);
                                                        //console.log('prop : ' + prop);
                                                        //throw e;
                                                    }
                                                }
                                            });
                                            //console.log('self.property ok ' + self.property);
                                            return {
                                                $modelValue: value,
                                                $viewValue: value,
                                                $setValidity: function () {
                                                }
                                            }
                                        }
                                    }

                                    if (angular.isUndefined(self.ctrl)) {
                                    //throw Error('Pas de controler pour la validation : ' + self.property);
                                        return true;
                                    }
                                    var currentValue = self.ctrl().$modelValue;
                                    if (self.dependencyRule) {
                                        if (angular.isDefined(service.validatableProperties[self.dependencyRule])) {
                                            var dependencyResult = service.validatableProperties[self.dependencyRule].validate();
                                            if (angular.isDefined(dependencyResult.then)) {
                                                return dependencyResult.then(function () {
                                                    if (!service.validatableProperties[self.dependencyRule].isValid()) {
                                                        return false;
                                                    }
                                                    if (!service.validatableProperties[self.dependencyRule].wasValidated) {
                                                        return false;
                                                    }
                                                    return validateProperty(self, currentValue, self.ctrl().$viewValue);
                                                });
                                            }
                                            if (!service.validatableProperties[self.dependencyRule].isValid()) {
                                                return false;
                                            }
                                            if (!service.validatableProperties[self.dependencyRule].wasValidated) {
                                                return false;
                                            }
                                        }
                                    }

                                    return validateProperty(self, currentValue, self.ctrl().$viewValue);
                                };
                            }
                        }
                        $scope.$broadcast('update_validation');
                    };

                    function createValidatatable(model, validatatable, currentProp) {
                        var rules = model.rules;
                        if (currentProp && currentProp.indexOf('rules') >= 0) {
                            return;
                        }
                        if (model) {
                            if (rules && model.rules.hasOwnProperty(keys.validationGroups)) {
                                transformGroup(rules);
                            }
                            for (var prop in model) {
                                if (angular.isFunction(model[prop])) {
                                    continue;
                                }
                                if (prop == keys.validationGroups) {
                                    continue;
                                }

                                if (!model.hasOwnProperty(prop)) {
                                    throw Error('la propriété ' + prop + ' n\'existe pas sur la donnée');
                                }
                                var property;
                                if (currentProp) {
                                    property = currentProp + '.' + prop;
                                }
                                if (rules && angular.isDefined(rules[prop])) {
                                    rules[prop].dependencyRule = undefined;
                                    validatatable[property ? property : prop] = rules[prop];
                                }
                                if (angular.isObject(model[prop]) || angular.isArray(model[prop])) {
                                    traverseValidation(model, validatatable, prop, property ? property : prop);
                                }
                            }
                        }
                    };

                    function transformGroup(currentRules) {
                        var groups = currentRules[keys.validationGroups];
                        angular.forEach(groups, function (group) {
                            angular.forEach(group.rules, function (rule, index) {
                                rule[keys.validationGroup] = group.name;
                                currentRules[index] = rule;
                            });
                        });
                    };

                    function traverseValidation(model, validatatable, prop, currentProp) {
                        if (model[prop] && !angular.isArray(model[prop])) {
                            var validatableProperty = model[prop].rules || {};
                            if (validatableProperty.hasOwnProperty(keys.validationGroups)) {
                                transformGroup(validatableProperty);
                            }
                            for (var ruleName in validatableProperty) {
                                if (ruleName == keys.validationGroups) {
                                    continue;
                                }
                                validatableProperty[ruleName].dependencyRule = currentProp;
                            }
                            createValidatatable(model[prop], validatatable, currentProp);
                        } else if (angular.isArray(model[prop])) {
                            var expression = currentProp ? currentProp : prop;
                            listenArray(model, expression);
                            angular.forEach(model[prop], function (value, index) {
                                createValidatatable(value, validatatable, expression + '[' + index + ']');
                            });
                        }
                    };

                    function listenArray(model, expression) {
                        var exp = expression;
                        if (angular.isUndefined(exp)) {
                            exp = service.propertyNameBinding;
                            $scope[service.propertyNameBinding] = model;
                        } else {
                            var expArray = exp.replace(/^\[(\d)+\]/, '$1').replace(/\[(\d)+\]/, '.$1').split('.'), tempModel = service.currentModel;
                            exp = expArray[expArray.length - 1];
                            for (var propName in expArray) {
                                if (!tempModel) {
                                    // cas qui ne doit pas arrivé sauf (automate)
                                    return;
                                }
                                tempModel = tempModel[expArray[propName]];
                            }
                            if ($scope[exp]) {
                                exp += Object.keys($scope).length;
                            }
                            $scope[exp] = tempModel;
                        }

                        $scope.$watch(exp + '.length', function (newLength, oldLength) {
                            if (newLength == undefined || oldLength == undefined) {
                                return;
                            }

                            // suppression de toutes les règles des elements existant sous le noeud 'expression'
                            // ajout des règles des éléments du tableau (équivaut à un 
                            if (newLength != oldLength) {
                                var newArray = $scope[exp];
                                var validatable;
                                var existingValidatables = Object.keys(service.validatableProperties);
                                angular.forEach(existingValidatables, function (validatableProp) {
                                    if (validatableProp) {
                                        if (expression && validatableProp.lastIndexOf(expression, 0) === 0 && validatableProp != expression || expression == undefined) {
                                            delete service.validatableProperties[validatableProp];
                                        }
                                    }
                                });

                                for (var i = 0; i < newArray.length; i++) {
                                    validatable = {
                                    };
                                    var expressionToValidate = expression == undefined ? '[' + i + ']' : expression + '[' + i + ']';
                                    createValidatatable(newArray[i], validatable, expressionToValidate);
                                    service.add(model, validatable);
                                }
                            }
                        });
                    };

                    function initialize() {
                        service.errors = {};
                        service.validatableProperties = {};
                        service.propertyNameBinding = '';
                    }

                    var errors = {},
                        keys =
                        {
                            validationGroups: "validationGroups",
                            validationGroup: "validationGroup"
                        },
                        service = {
                            errors: errors,
                            propertyNameBinding: '',
                            validatableProperties: {},
                            hideMessage: hideMessage,
                            showMessage: showMessage,
                            apply: apply,
                            validate: validate,
                            validateGroup: validateGroup,
                            isValid: isValid,
                            enable: enable,
                            disable: disable,
                            remove: remove,
                            add: add,
                            createValidatatable: createValidatatable,
                            config: $this.config,
                            eachValidatable: eachValidatable,
                            getValidation: function (property, fn) {
                                if (fn) {
                                    if (service.validatableProperties[property]) {
                                        fn(service.validatableProperties[property]);
                                        return null;
                                    }
                                    var child = $scope.$new();
                                    var unbind = child.$on('update_validation', function () {
                                        for (var itemName in service.validatableProperties) {
                                            if (itemName.indexOf(property) > -1) {
                                                var item = service.validatableProperties[itemName];
                                                if (angular.isUndefined(item)) {
                                                    throw Error("Impossible trouver la validation pour " + itemName);
                                                }
                                                //item.property = itemName;
                                                unbind();
                                                fn(item);
                                                break;
                                            }
                                        }
                                    });
                                    return null;
                                }
                                return service.validatableProperties[property];
                            }
                        };

                    return service;
                }
            ];
        };
        /*
        *   Service permettant la gestion du summary si un input et en erreur ou non
        */
        var summaryService = [
                function () {
                    var collections = {
                    };
                    var instance = {
                        summaries: []
                    };
                    return instance;
                }
        ];


        angular.module('af-validation-core', [])
            .provider('s.validation', provider)
            .service('s.summary-error', summaryService);
    })();
})();
define("angular/angular-validation-core", function(){});

(function () {
    var afmodule = angular.module('af-validation-elements', ["af-validation-core", "af-validation-templates"]);
    /*
    *   Element permettant la gestion des erreurs d'un input.  
    */
    afmodule.directive('afErrorPlaceholder', [
        function () {
            return {
                priority: 0,
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/validation/error-placeholder.html'
            }
        }
    ]);
    /*
    *   Element permettant la gestion du message de success d'un input
    */
    afmodule.directive('afValidationState', [
        function () {
            return {
                priority: 0,
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/validation/validation-state.html'
            }
        }
    ]);
    /*
    *   Attribut permettant la gestion de la validation d'un input.
    */
    afmodule.directive('afValidate', [
        '$timeout', '$compile', 's.validation', 's.summary-error', function ($timeout, $compile, validationService, summaryErrorService) {
            return {
                priority: 0,
                restrict: 'A',
                require: ['ngModel', 'afValidate'],
                scope: false,
                controller: [
                    '$scope', function($scope) {
                        var scope = $scope.$new(true);
                        this.scope = scope;

                        scope.validateProperty = undefined;
                        scope.summaryItem = undefined;
                        scope.$on("$destroy", function () {
                            delete summaryErrorService.summaries[scope.summaryItem.index];
                            if (angular.isDefined(scope.validateProperty)) {
                                scope.validateProperty.disable();
                            }
                        });

                        scope.$watch('validateProperty', function (newValue) {
                            if (angular.isUndefined(newValue) === undefined) {
                                return;
                            }

                            angular.forEach(newValue, function (item) {
                                if (item) {
                                    var prop = item;
                                    if (angular.isObject(item)) {
                                        angular.forEach(item, function (rule, name) {
                                            prop = name;
                                        });
                                    }

                                    scope.$watch('validateProperty[\'' + prop + '\'].isEnabled', function (value) {
                                        if (value === false) {
                                            scope.validateProperty.validate();
                                        }
                                    });
                                }
                            });
                        });
                        this.triggerValidate = function () {
                            // cf. propertyChange function in link for why it's done like that
                            scope.validateProperty.showMessage = true;
                            $timeout(function () {
                                scope.validateProperty.validate();
                            }, 0);
                        };
                    }
                ],
                link: function(scopeParent, input, attrs, controllers) {
                    var scope = controllers[1].scope;

                    function validate() {
                        scope.validateProperty.validate();
                    };

                    function propertyChange() {
                        if (!scope.validateProperty.showMessage) {
                            scope.validateProperty.showMessage = true;
                        }
                        $timeout(function () {
                            validate();
                        });
                    };

                    function parseBoolProp(val) {
                        if (angular.isUndefined(val)) {
                            return false;
                        }
                        if (val === '') {
                            return true;
                        }
                        return /^\s*true\s*$/.test(val);
                    };

                    function valueValidation(validateProperty, property, fn) {
                        if (angular.isUndefined(validateProperty)) {
                            throw Error('Aucune validation pour le binding : ' + property);
                        }
                        validateProperty.ctrl = function () {
                            return controllers[0];
                        }
                        // validateProperty.property = property;
                        scope.validateProperty = validateProperty;

                        // Si souhaite afficher les placeholders
                        var noPlaceholder = parseBoolProp(attrs.afValidateNoPlaceholder);
                        if (!noPlaceholder) {
                            // Si on souhaite afficher le message d'erreur
                            var noErrorPlaceholder = parseBoolProp(attrs.afValidateNoErrorPlaceholder);
                            !noErrorPlaceholder && generateErrorPlaceholder();

                            // Si on souhaite afficher l'icone de statut
                            var noStatePlaceholder = parseBoolProp(attrs.afValidateNoStatePlaceholder);
                            !noStatePlaceholder && generateStatePlaceholder();
                        }
                        validateProperty.enable();
                        fn();

                    }

                    function getValidationProperty(fn) {
                        var property, propertyName;
                        // Si on passe en paramètre le nom de la règle à valider
                        if (attrs.afValidate !== "") {
                            property = attrs.afValidate;
                        } else {
                            if (attrs.ngModel.lastIndexOf("]") === (attrs.ngModel.length - 1) &&
                                scopeParent.$eval(attrs.ngModel.replace(/\[([^\[]*)$/, ".rules[" + '$1'))) {
                                // Recherche la clés des rules à partir de model[q.firstname] => property = model.rules[q.firstname].property
                                property = scopeParent.$eval(attrs.ngModel.replace(/\[([^\[]*)$/, ".rules[" + '$1')).property;
                            } else if (scopeParent.$eval(attrs.ngModel.replace(/\.([^\.]*)$/, ".rules." + '$1'))) {
                                // Recherche la clés des rules à partir de model.firstname => property = model.rules.firstname.property
                                property = scopeParent.$eval(attrs.ngModel.replace(/\.([^\.]*)$/, ".rules." + '$1')).property;
                            } else {
                                console.log('pas de validation : ' + attrs.ngModel);
                                return;
                            }
                        }

                        propertyName = scopeParent.$eval(property) || property;
                        validationService.getValidation(propertyName, function (item) {
                            valueValidation(item, propertyName, fn);
                        });
                    };

                    function generateErrorPlaceholder() {
                        var span;
                        if (angular.isDefined(attrs.afValidateErrorPlaceholderId)) {
                            var eltDom = document.getElementById(attrs.afValidateErrorPlaceholderId);
                            if (!eltDom) {
                                var str;
                                if (input[0].hasAttribute("af-validate-error-placeholder-id")) {
                                    str = input[0].attributes["af-validate-error-placeholder-id"].value;
                                }
                                else if (input[0].hasAttribute("data-af-validate-error-placeholder-id")) {
                                    str = input[0].attributes["data-af-validate-error-placeholder-id"].value;
                                }
                                if (attrs.afValidateErrorPlaceholderId !== str) {
                                    var eltDomParent = angular.element(input).parent();
                                    while (!eltDom && eltDomParent[0]) {
                                        eltDom = eltDomParent[0].querySelector('[id=' + str.replace(/{/g, '\\{').replace(/}/g, '\\}') + ']');
                                        eltDomParent = eltDomParent.parent();
                                    }
                                }
                            }
                            span = angular.element(eltDom);
                            span.attr('ng-hide', 'validateProperty.showMessage === false || validateProperty.ctrl().$valid');
                            span.attr('ng-bind', 'validateProperty.error.message');
                            span.addClass(validationService.config.placeholderClass.error);
                            $compile(span)(scope);
                            return;
                        }

                        var compiledTemplate = $compile(validationService.config.errorTemplate())(scope);
                        if (angular.isDefined(attrs.afValidateErrorAfterId)) {
                            var placeholder = angular.element(document.getElementById(attrs.afValidateErrorAfterId));
                            placeholder.after(compiledTemplate);
                        } else {
                            input.after(compiledTemplate);
                        }
                    }

                    function generateStatePlaceholder() {
                        var span;
                        if (angular.isDefined(attrs.afValidateStatePlaceholderId)) {
                            var eltDom = document.getElementById(attrs.afValidateStatePlaceholderId)
                            if (!eltDom) {
                                var str;
                                if (input[0].hasAttribute("af-validate-state-placeholder-id")) {
                                    str = input[0].attributes["af-validate-state-placeholder-id"].value;
                                }
                                else if (input[0].hasAttribute("data-af-validate-state-placeholder-id")) {
                                    str = input[0].attributes["data-af-validate-state-placeholder-id"].value;
                                }
                                if (attrs.afValidateErrorPlaceholderId !== str) {
                                    var eltDomParent = angular.element(input).parent();
                                    while (!eltDom && eltDomParent[0]) {
                                        eltDom = eltDomParent[0].querySelector('[id=' + str.replace(/{/g, '\\{').replace(/}/g, '\\}') + ']');
                                        eltDomParent = eltDomParent.parent()
                                    }
                                }
                            }
                            span = angular.element(eltDom);
                            span.attr('ng-show', 'validateProperty.showMessage && (validateProperty.ctrl().$invalid || validateProperty.validating  || validateProperty.ctrl().$valid)');
                            span.addClass(validationService.config.placeholderClass.state);
                            $compile(span)(scope);
                            return;
                        }

                        var compiledTemplate = $compile(validationService.config.stateTemplate())(scope);
                        if (angular.isDefined(attrs.afValidateStateAfterId)) {
                            var placeholder = angular.element(document.getElementById(attrs.afValidateStateAfterId));
                            placeholder.after(compiledTemplate);
                        } else {
                            input.after(compiledTemplate);
                        }
                    }

                    function getElementToDecorate() {
                        var elementToDecorate = angular.element(document.getElementById(attrs.afValidateDecorateElementId));
                        if (!elementToDecorate[0]) {
                            elementToDecorate = angular.element(document.getElementById(scopeParent.$eval(attrs.afValidateDecorateElementId)));
                        }
                        if (elementToDecorate[0] === undefined) {
                            return input;
                        }
                        return elementToDecorate;

                    };

                    scope.summaryItem = {
                        element: input,
                        index: scope.$id,
                        name: "",
                        labelFor: function () {
                            var labelFor = document.querySelectorAll("[for=\"" + this.name + "\"]")[0];
                            if (labelFor) {
                                return labelFor.textContent.replace("*", "");
                            }
                            return "";
                        }
                    };

                    var name = attrs.name;
                    if (name) {
                        // TODO: la ligne suivante est probablement inutile, car le {{ $index }} est normalement résolu via attrs.name
                        scope.summaryItem.name = name.replace('{{$index}}', scope.$index);
                    }
                    getValidationProperty(function () {
                        var label, requiredLabel;
                        scope.$watch('validateProperty.isRequired', function (isRequired) {
                            if (angular.isUndefined(label)) {
                                label = document.querySelectorAll('[for="' + scope.summaryItem.name + '"]')[0];
                                if (angular.isUndefined(label)) {
                                    return;
                                }
                                label = angular.element(label);
                            }

                            var spanTemplate = '<span class="required">*</span>';
                            if (label[0].innerHTML.indexOf(spanTemplate) >= 0) {
                                requiredLabel = angular.element(label[0].children[0]);
                            }

                            if (angular.isUndefined(requiredLabel)) {
                                requiredLabel = angular.element(spanTemplate);
                                label.append(requiredLabel);
                            }

                            requiredLabel.addClass("hide");
                            if (isRequired) {
                                requiredLabel.removeClass("hide");
                            }
                        });

                        scope.$watch('validateProperty.showMessage', function (show) {
                            if (scope.validateProperty.validating === true && validationService.config.validOn === 'no_trigger') {
                                return;
                            }
                            if (show === false) {
                                delete summaryErrorService.summaries[scope.summaryItem.index];
                                getElementToDecorate().removeClass(validationService.config.errorClass);
                                getElementToDecorate().removeClass(validationService.config.successClass);
                            } else if (scope.validateProperty.ctrl().$valid === false) {
                                summaryErrorService.summaries[scope.summaryItem.index] = scope.summaryItem;
                                getElementToDecorate().addClass(validationService.config.errorClass);
                                getElementToDecorate().removeClass(validationService.config.successClass);
                            } else if (scope.validateProperty.ctrl().$valid === true) {
                                delete summaryErrorService.summaries[scope.summaryItem.index];
                                getElementToDecorate().removeClass(validationService.config.errorClass);
                                getElementToDecorate().addClass(validationService.config.successClass);
                            }
                        });
                        scope.$watch('validateProperty.ctrl().$valid', function (valid) {
                            if (scope.validateProperty.showMessage === true) {
                                if (valid === false) {
                                    scope.summaryItem.group = scope.validateProperty.error.group;
                                    summaryErrorService.summaries[scope.summaryItem.index] = scope.summaryItem;
                                    getElementToDecorate().addClass(validationService.config.errorClass);
                                    getElementToDecorate().removeClass(validationService.config.successClass);
                                } else {
                                    delete summaryErrorService.summaries[scope.summaryItem.index];
                                    getElementToDecorate().addClass(validationService.config.successClass);
                                    getElementToDecorate().removeClass(validationService.config.errorClass);
                                }
                            } else {
                                getElementToDecorate().removeClass(validationService.config.successClass);
                                getElementToDecorate().removeClass(validationService.config.errorClass);
                            }
                        });

                        scope.$watch('validateProperty.validating', function (validating, oldValue) {
                            if (validating) {
                                getElementToDecorate().removeClass(validationService.config.successClass);
                                getElementToDecorate().removeClass(validationService.config.errorClass);
                                getElementToDecorate().addClass(validationService.config.validatingClass);
                            } else if (validating !== oldValue) {
                                if (scope.validateProperty.error.hasError) {
                                    getElementToDecorate().addClass(validationService.config.errorClass);
                                } else {
                                    getElementToDecorate().addClass(validationService.config.successClass);
                                }
                                getElementToDecorate().removeClass(validationService.config.validatingClass);
                            }
                        });
                        if (angular.isDefined(attrs.ngDisabled)) {
                            scope.$watch(attrs.ngDisabled, function (disabled) {
                                $timeout(function () {
                                    if (disabled == false) {
                                        scope.validateProperty.enable();
                                        return;
                                    }
                                    if (disabled == true) {
                                        scope.validateProperty.disable();
                                    }
                                }, false);
                            });
                            scopeParent.$watch(attrs.ngDisabled, function (disabled) {
                                $timeout(function () {
                                    if (disabled == false) {
                                        scope.validateProperty.enable();
                                        return;
                                    }
                                    if (disabled == true) {
                                        scope.validateProperty.disable();
                                    }
                                }, false);
                            });
                        }
                        if (validationService.config.validOn != 'no_trigger') {
                            if ((validationService.config.validOn === 'lostFocus'
                                    && attrs.afValidateOn === undefined || attrs.afValidateOn === 'lostFocus')
                                && attrs.type !== 'hidden') {
                                if ((attrs.type === "checkbox" || attrs.type === "radio" | attrs.type === 'button')) {
                                    input.bind('click touchend', function () {
                                        propertyChange();
                                    });
                                } else {
                                    input.bind('blur', function () {
                                        propertyChange();
                                    });
                                }
                            } else if (attrs.afValidateOn !== undefined) {
                                input.bind(attrs.afValidateOn, function () {
                                    propertyChange();
                                });
                            } else {
                                scope.$watch(attrs.ngModel, function () {
                                    propertyChange();
                                }, true);
                            }
                            angular.forEach(scope.validateProperty.dependencyProperties, function (dependency) {
                                var binding = attrs.ngModel.split('.');
                                if (dependency.split('.').length > 1) {
                                    binding = dependency;
                                } else if (binding.length > 1) {
                                    binding.length = binding.length - 1;
                                    binding = binding.join('.') + '.' + dependency;
                                } else {
                                    binding = dependency;
                                }
                                scope.$watch(binding, function (newValue, oldValue) {
                                    validate();
                                }, true);
                                scopeParent.$watch(binding, function (newValue, oldValue) {
                                    validate();
                                }, true);
                            });
                        } else {
                            scope.$watch(attrs.ngModel, function () {
                                scope.validateProperty.showMessage = false;
                            }, true);
                        }
                    });
                }
            };
        }
    ]);
    
    /*
    *   Element permettant l'affichage d'un sommaire d'erreur pour les input à valider.
    */
    afmodule.directive('afSummaryErrors', [
        '$location', '$anchorScroll', 's.summary-error', function ($location, $anchorScroll, summaryErrorService) {
            function includes(array, value, fnGetValue) {
                var index = 0;
                var currentElement;
                while (index < array.length) {
                    currentElement = fnGetValue(array[index]);
                    if (value === currentElement ||
                       (value !== value && currentElement !== currentElement)) {
                        return true;
                    }
                    index++;
                }
                return false;
            }
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'templates/validation/errors-summary.html',
                scope: {
                    groupName: "@"
                },
                link: function (scope, elm, attrs) {
                    scope.summaries = [];
                    scope.showSummary = function () {
                        scope.summaries.length = 0;
                        //inspecter form
                        angular.forEach(summaryErrorService.summaries, function (summary) {
                            if (summary.group === scope.groupName) {
                                var present = includes(scope.summaries, summary.labelFor(), function (item) {
                                    return item.labelFor();
                                })
                                if (!present) {
                                    scope.summaries.push(summary);
                                }
                            }
                        });
                        return scope.summaries.length;
                    };
                    scope.setFocus = function (summary) {
                        summary.element[0].focus();
                        $location.hash(summary.name);
                        $anchorScroll();
                    };
                }
            };
        }
    ]);
}());
define("angular/angular-validation-elements", function(){});

(function () {
    angular.module("templates/validation/error-placeholder.html", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("templates/validation/error-placeholder.html",
        '<span ng-hide="validateProperty.showMessage === false || validateProperty.ctrl().$valid">{{ validateProperty.error.message }}</span>');
    }]);
    angular.module("templates/validation/validation-state.html", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("templates/validation/validation-state.html",
        '<i ng-show="validateProperty.showMessage && (validateProperty.ctrl().$invalid || validateProperty.validating  || validateProperty.ctrl().$valid)"></i>');
    }]);
    angular.module("templates/validation/errors-summary.html", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("templates/validation/errors-summary.html",
        '<div ng-show="showSummary()" class="alert alert-error error_form"><i class="icon-axa axa-cross"></i><strong> Les champs suivants contiennent une erreur :</strong><ul><li ng-repeat="summary in summaries track by $index"><a href="javascript:void(0)" ng-click="setFocus(summary)">{{ summary.labelFor() }}</a></li></ul></div>');
    }]);

    angular.module("af-validation-templates", ["templates/validation/error-placeholder.html", "templates/validation/validation-state.html", "templates/validation/errors-summary.html"]);
})();
define("angular/angular-validation-templates", function(){});




requirejs.config({
    urlArgs: 'v=1.0',
    paths: {
        text: 'axa/amd/text'
    }
});

define("angular-validation", [], function () {
    var angular = window.angular;
    if (!angular) {
        throw "Angular est un prérequis au chargement de cette api";
    }

    require("angular/angular-validation-core");
    require("angular/angular-validation-templates");
    require("angular/angular-validation-elements");

    angular.module('afValidation', ["af-validation-elements"]);

});

define("angular/angular-validation", function(){});


require(["angular-validation"]);
    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    return require('angular-validation');
}));