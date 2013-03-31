var conjoiners = require('../lib/conjoiners');

var cj1 = {};
var cj2 = {};
conjoiners.implant(cj1, 'test/conf.json', 'test');
conjoiners.implant(cj2, 'test/conf.json', 'test2');

exports['simple inter-process communication'] = function(test) {
    'use strict';

    test.expect(1);
    var firstSleep = function() {
        cj1.val = 'test_value';
        setTimeout(secondSleep, 1000);
    };

    var secondSleep = function() {
        test.equal(cj2.val, 'test_value');
        test.done();
    };

    setTimeout(firstSleep, 1500);
};

