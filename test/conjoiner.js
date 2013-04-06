'use strict';

var conjoiners = require('../lib/conjoiners');

exports['simple inter-process communication'] = function(test) {
    test.expect(1);

    var cj1 = {};
    var cj2 = {};

    conjoiners.implant(cj1, 'test/conf.json', 'test').then(function() {
        return conjoiners.implant(cj2, 'test/conf.json', 'test2');
    }).then(function () {
        cj1.val = 'test_value';
        setTimeout(function() {
            test.equal(cj2.val, 'test_value');
            test.done();
        }, 1500);
    }).done();
};

