var conjoiners = require('../lib/conjoiners');

var cj1 = {};
var cj2 = {};
conjoiners.implant(cj1, 'test/conf_conjoiner.json', 'test', function(o) {
    conjoiners.implant(cj2, 'test/conf_conjoiner.json', 'test2', function(o) {
        cj1.val = 'test_value';
    });
});

exports['simple inter-process communication'] = function(test) {
    'use strict';

    test.expect(1);
 
    setTimeout(function() {
        test.equal(cj2.val, 'test_value');
        test.done();
    }, 1500);
};
