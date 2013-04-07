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
