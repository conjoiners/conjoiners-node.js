'use strict';

var conjoiners = require('../lib/conjoiners');

exports['simple inter-process communication'] = function(test) {
    test.expect(1);

    var cj1 = {
        val: null
    };
    var cj2 = {};

    conjoiners.implant(cj1, 'test/conf.json', 'test').then(function() {
        return conjoiners.implant(cj2, 'test/conf.json', 'test2');
    }).then(function () {
        var firstSleep = function() {
            cj1.val = 'test_value';
            setTimeout(secondSleep, 1000);
        };

        var secondSleep = function() {
            test.equal(cj2.val, 'test_value');
            test.done();
        };

        setTimeout(firstSleep, 1500);
    }).done();
};

