'use strict';

var Bacon = require("baconjs").Bacon;

exports.streamify = function (obj, emitter) {
    var streamObject = {};

    Object.keys(obj).forEach(function (property) {
        var stream = new Bacon.EventStream(function (subscriber) {
            subscriber(new Bacon.Next(obj[property]));

            var listener = function (event) {
                if (event.property === property) {
                    subscriber(new Bacon.Next(event.value));
                }
            };
            emitter.on('update', listener);

            return function() {
                emitter.removeListener('update', listener);
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
