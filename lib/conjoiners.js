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

var fs = require('fs');
var zmq = require('zmq');
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


/**
 * @function
 * @description
 * Load the configuration file from disk.
 *
 * @param {String} path Path to the configuration file.
 * @returns {Q.promise} A promise which is resolved once the initialisation is
 *      complete or when an error occurs. Conjoiners is using
 *      <a href='https://github.com/kriskowal/Q'>Q promises</a>. The resolved
 *      value is the parsed configuration file's content, i.e. an Object.
 */
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


/**
 * @function
 * @description
 * Get the configuration part for the specific conjoiner.
 *
 * @param {Object} config Conjoiner configuration
 * @param {String} name Name of the conjoiner for which the configuration
 *      should be returned.
 * @returns {Object} Configuration for the specific conjoiner.
 */
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


/**
 * @function
 * @description
 * Bind a zmq PUB socket to the given URL. A promise is returned as binding is
 * asynchronous.
 *
 * @param {String} url URL to which the PUB socket will be bound.
 * @returns {Q.promise} A promise which is resolved once the initialisation is
 *      complete or when an error occurs. Conjoiners is using
 *      <a href='https://github.com/kriskowal/Q'>Q promises</a>. The resolved
 *      value is the zmq PUB socket.
 */
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


/**
 * @function
 * @description
 * Establish a connection to the given endpoint and subscribe to all messages.
 *
 * @param {String} url Well, the URL to connect to, i.e. the PUB endpoint.
 * @returns {zmq.socket} The created SUB socket.
 */
var connect = function (url) {
    logger.info('Subscribing to all transenlightenments of', url);
    var socket = zmq.socket('sub');
    socket.connect(url);
    // subscribe to all messages
    socket.subscribe('');
    return socket;
};


/**
 * @function
 * @description
 * Connect to all fellow conjoiners so that transenlightenments can be
 * received. This function merely establishes the connection and does NOT
 * add any change listeners.
 *
 * @param {Object} config Conjoiner configuration
 * @param {String} ignoreConjoiner Name of the conjoiner which should not be
 *      connected to. Typically, this is the name of the conjoiner for which
 *      a PUB socket is opened.
 * @returns {Array[zmq.socket]} All the created SUB sockets.
 */
var createSubConnections = function (config, ignoreConjoiner) {
    return config.conjoiners.filter(function (conjoiner) {
        return conjoiner.name !== ignoreConjoiner;
    }).map(function (conjoiner) {
            return connect(conjoiner.url);
        });
};


/**
 * @function
 * @description
 * Update fellow conjoiners about a property update.
 *
 * Please note: Transenlightenments are currently just published and not
 * checked for completion status. For this reason, this function returns
 * undefined.
 *
 * @param {zmq.socket} pubSocket
 * @param {String} sender Origin of the update, i.e. the conjoiner's name.
 * @param {String} property Updated property's name.
 * @param {Object} value The new value
 */
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


/**
 * @function
 * @description
 * Observe property value changes and call the onChangeCallback.
 *
 * @param {Object} obj The object on which the property should be hooked.
 * @param {String} property Name of the property which should be hooked.
 * @param {Function} onChangeCallback This function is called whenever the
 *      property is changed through assignment.
 * @returns {Function} A setter which can be used to set the property's value
 *      without a call to onChangeCallback(). Basically, you are going to use
 *      this function to set this value "internally".
 */
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


/**
 * @function
 * @description
 * Parses and analyses the transenlightenment for property updates and sets
 * the updated properties on the object.
 *
 * @param {String} payload Transenlightenment's payload. Please note that this
 *      function accepts the payload in textual form.
 * @param {Function} ensureHooked Function to be called for every property. The
 *      function should be able to handle new and already bound properties!
 *      The function should return another function which can be used to set
 *      the property on the target object without additional multicasts!
 * @return {Array[String]} Updated properties names
 */
var handleIncomingTransenlightenment = function (payload, ensureHooked) {
    logger.debug('Handling incoming transenlightenment', payload);
    var update = JSON.parse(payload);

    var updatedProperties = Object.keys(update).filter(function (key) {
        return key.substring(0, prefixes.set.length) === prefixes.set;
    });

    updatedProperties.forEach(function (key) {
        var property = key.substring(prefixes.set.length);
        var directSetter = ensureHooked(property);
        directSetter(update[key]);
    });

    return updatedProperties.map(function (key) {
        return key.substring(prefixes.set.length);
    });
};


/**
 * @function
 * @description
 * Keep hooking properties as they are added to the Object. This is actually
 * using a stupid workaround under the bonnet as there is no way to observe
 * a whole object for property additions...
 *
 * @param {Object} obj The object which should be observed for property
 *      additions.
 * @param {Function} ensureHooked Function to be called for every property. The
 *      function should be able to handle new and already bound properties!
 */
var continuouslyHookProperties = function (obj, ensureHooked) {
    Object.keys(obj).forEach(ensureHooked);
    setTimeout(continuouslyHookProperties, 1000, obj, ensureHooked);
};


var emitOnTransenlightenment = function (obj, property) {
    if (typeof obj.onTransenlightenment === 'function') {
        obj.onTransenlightenment({
            property: property
        });
    }
};


/**
 * @function
 * @description
 * Internal implant function. This is where the magic happens! Bind pub/sub
 * sockets, hook properties etc..
 *
 * @param {Object} obj The object for which conjoiners functionality will be
 *      implanted.
 * @param {Object} config The conjoiners configuration file. In contrast to
 *      {@link implant} this function accepts to parsed file and not a
 *      file path.
 * @param {String} name The conjoiner's name as defined in the configuration
 *      file.
 * @return {Q.promise} A promise which is resolved once the initialisation is
 *      complete or when an error occurs. Conjoiners is using
 *      <a href='https://github.com/kriskowal/Q'>Q promises</a>.
 */
var implantInternal = function (obj, config, name) {
    logger.info('Implanting conjoiner', name);

    var conjoinerConfig = getConjoinerFromConfig(config, name);

    // handle outgoing transenlightenments through this socket
    return bind(conjoinerConfig.url).then(function (pubSocket) {
        // method to call with updates
        var changeCallback = function (property, value) {
            updateConjoiners(pubSocket, name, property, value);
            emitOnTransenlightenment(obj, property);
        };

        // these setters do not result in a multicast and can therefore be used
        // for incoming transenlightenments
        var directSetters = {};
        var ensureHooked = function (property) {
            if (directSetters[property] == null &&
                    typeof obj[property] !== 'function') {
                directSetters[property] = hook(obj, property, changeCallback);

                // multicast the initial value
                if (obj[property] != null) {
                    obj[property] = obj[property];
                }
            }
            return directSetters[property];
        };
        continuouslyHookProperties(obj, ensureHooked);

        // handle incoming transenlightenments
        var subConnections = createSubConnections(config, name);
        var emitter = emitOnTransenlightenment.bind(this, obj);
        subConnections.forEach(function (subConnection) {
            subConnection.on('message', function (payload) {
                var props = handleIncomingTransenlightenment(payload.toString(),
                    ensureHooked);
                props.forEach(emitter);
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
