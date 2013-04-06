/*
 This file is part of conjoiners

 Copyright (c) 2013 by Pavlo Baron (pb at pbit dot org)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

'use strict';

var zmq = require('zmq');
var fs = require('fs');
var Q = require('q');
var winston = require('winston');

winston.addColors({
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
});

var logger = new (winston.Logger)({
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            colorize: true,
            level: 'debug'
        })
    ]
});


var prefixes = {
    set: 'set_'
};

var readConfigFile = function (path) {
    var deferred = Q.defer();

    fs.readFile(path, 'utf-8', function(err, data) {
        if (err) {
            deferred.reject(new Error(err));
        }

        var config = JSON.parse(data);
        deferred.resolve(config);
    });

    return deferred.promise;
};


var getConjoinerFromConfig = function (config, name) {
    var matchingConjoiners = config.conjoiners.filter(function (conjoiner) {
        return conjoiner.name === name;
    });

    if (matchingConjoiners.length > 0) {
        return matchingConjoiners[0];
    }

    throw new Error('The conjoiner "' + name + '" could not be located in ' +
        'the configuration file.');
};


var bind = function (url) {
    logger.info('Publishing transenlightenments to', url);
    var deferred = Q.defer();

    var socket = zmq.socket('pub');
    socket.bind(url, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(socket);
        }
    });

    return deferred.promise;
};


var connect = function (url) {
    logger.info('Subscribing to all transenlightenments of', url);
    var socket = zmq.socket('sub');
    socket.connect(url);
    // subscribe to all events
    socket.subscribe('');
    return socket;
};


var createSubConnections = function (config, ignoreConjoiner) {
    return config.conjoiners.filter(function (conjoiner) {
        return conjoiner.name !== ignoreConjoiner;
    }).map(function (conjoiner) {
            return connect(conjoiner.url);
        });
};


var updateConjoiners = function (pubSocket, sender, property, value) {
    // prepare payload for sending
    var payload = {
        sender: sender,
        time: new Date().getTime()
    };
    payload[prefixes.set + property] = value;

    logger.debug('Sending payload', payload);

    // send payload to all subscribers
    pubSocket.send(JSON.stringify(payload), zmq.NOBLOCK);
};


var hook = function (obj, property, onChangeCallback) {
    logger.debug('Hooking property: ', property);

    // we start of by storing the current value
    var value = obj[property];

    var getter = function () {
        return value;
    };

    var setter = function (newValue) {
        value = newValue;
        onChangeCallback(property, value);
    };

    // setter used for incoming transenlightenments to avoid the default setter,
    // i.e. the multicast
    var setterWithoutCallback = function (newValue) {
        value = newValue;
    };

    Object.defineProperty(obj, property, {
        configurable: false,
        enumerable: true,
        get: getter,
        set: setter
    });

    return setterWithoutCallback;
};


var handleIncomingTransenlightenment = function (payload, ensureHooked) {
    logger.debug('Handling incoming transenlightenment', payload);
    var update = JSON.parse(payload);

    Object.keys(update).filter(function (key) {
        return key.substring(0, prefixes.set.length) === prefixes.set;
    }).forEach(function (key) {
            var property = key.substring(prefixes.set.length);
            var directSetter = ensureHooked(property);
            directSetter(update[key]);
        });
};


var continuouslyHookProperties = function (obj, ensureHooked) {
    Object.keys(obj).forEach(ensureHooked);
    setTimeout(continuouslyHookProperties, 1000, obj, ensureHooked);
};


var implantInternal = function (obj, config, name) {
    logger.info('Implanting conjoiner', name);

    var conjoinerConfig = getConjoinerFromConfig(config, name);

    // handle outgoing transenlightenments through this socket
    return bind(conjoinerConfig.url).then(function (pubSocket) {
        // method to call with updates
        var changeCallback = updateConjoiners.bind(this, pubSocket, name);
        // these setters do not result in a multicast and can therefore be used
        // for incoming transenlightenments
        var directSetters = {};
        var ensureHooked = function (property) {
            if (directSetters[property] == null) {
                directSetters[property] = hook(obj, property, changeCallback);
                // multicast the initial value
                obj[property] = obj[property];
            }
            return directSetters[property];
        };
        continuouslyHookProperties(obj, ensureHooked);

        // handle incoming transenlightenments
        var subConnections = createSubConnections(config, name);
        subConnections.forEach(function (subConnection) {
            subConnection.on('message', function (payload) {
                handleIncomingTransenlightenment(payload.toString(),
                    ensureHooked);
            });
        });
    });
};


/**
 * @function
 * @description
 * Activate conjoiners for the given object thereby enabling state sharing
 * between various endpoints.
 *
 * @param {Object} obj The object for which conjoiners functionality will be
 *      implanted.
 * @param {String} configFilePath Location of the conjoiners configuration
 *      file. The configuration file should be UTF-8 encoded and be in JSON
 *      format.
 * @param {String} name The conjoiner's name as defined in the configuration
 *      file.
 * @return {Q.promise} A promise which is resolved once the initialisation is
 *      complete or when an error occurs. Conjoiners is using
 *      <a href='https://github.com/kriskowal/Q'>Q promises</a>.
 */
exports.implant = function (obj, configFilePath, name) {
    return readConfigFile(configFilePath).then(function (config) {
        return implantInternal(obj, config, name);
    });
};
