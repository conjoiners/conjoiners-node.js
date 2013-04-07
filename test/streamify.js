'use strict';

var _ = require('lodash');
var conjoiners = require('../lib/index');

exports['Bacon streams should emit events for all updates'] = function (test) {

    var cj1 = {};
    var cj1Name = 'test';

    // properties need to be defined beforehand for streamified properties
    var cj2 = {
        val: null
    };

    var values = _.range(20);

    conjoiners.implant(cj1, 'test/conf.json', 'test').then(function() {
        return conjoiners.implant(cj2, 'test/conf.json', 'test2');
    }).then(function (cj2Emitter) {
        var cj2Stream = conjoiners.streamify(cj2, cj2Emitter);
        var valIndex = -1;

        // just a simple test to see how values over time can be expressed
        cj2Stream.val.throttle(10).skipDuplicates().map(Math.pow, 2).log();

        cj2Stream.val.onValue(function (value) {
            test.equal(value, values[valIndex]);

            if (valIndex + 1 >= values.length) {
                test.done();
            }
        });

        setTimeout(function sendValues () {
            valIndex += 1;
            cj1.val = values[valIndex];

            if (valIndex + 1 < values.length) {
                setTimeout(sendValues, 100);
            }
        }, 100);
    }).done();
};
