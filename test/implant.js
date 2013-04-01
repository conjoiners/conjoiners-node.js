var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    'use strict';

    test.expect(1);

    var obj = {};
    conjoiners.implant(obj, 'test/conf.json', 'test_implant', function() {
        obj.val = 'implant_value';

        var afterSleep = function() {
            test.equal(obj.val, 'implant_value');
            test.done();
        };

        setTimeout(afterSleep, 100);
    });
};
