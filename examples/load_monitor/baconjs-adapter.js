'use strict';

var Bacon = require('baconjs').Bacon;
var EventEmitter = require('events').EventEmitter;

exports.streamify = function (obj) {
    var streamObject = {};

    Object.keys(obj).forEach(function (property) {
        var stream = new Bacon.EventStream(function (subscriber) {
            subscriber(new Bacon.Next(obj[property]));

            var listener = function (event) {
                if (event.property === property) {
                    subscriber(new Bacon.Next(obj[property]));
                }
            };
            obj.transenlightenment.on(property, listener);

            return function() {
                obj.transenlightenment.removeListener(property, listener);
            };
        });

        var getter = function () {
            return stream;
        };

        var setter = function (newValue) {
            obj[property] = newValue;
        };

        Object.defineProperty(streamObject, property, {
            configurable: false,
            enumerable: true,
            get: getter,
            set: setter
        })
    });

    return streamObject;
};
