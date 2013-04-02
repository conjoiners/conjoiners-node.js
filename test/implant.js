var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    'use strict';

    test.expect(1);

    var obj = {};
    obj.val = 'implant_value';
    conjoiners.implant(obj, 'test/conf_implant.json', 'test_implant', function() {
        test.equal(obj.val, 'implant_value');
        test.done();
    });
};
