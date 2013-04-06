'use strict';

var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    test.expect(1);

    var obj = {};

    conjoiners.implant(obj, 'test/conf.json', 'test_implant').then(function() {
        obj.val = 'implant_value';
        test.equal(obj.val, 'implant_value');
        test.done();
    }).done();
};
