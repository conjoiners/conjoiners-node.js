'use strict';

var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    test.expect(3);

    var value = 'implant_value';
    var conjoinerName = 'test_implant';

    var obj = {
        onTransenlightenment: function (event) {
            test.equal(event.property, 'val');
            test.equal(this[event.property], value);
            test.done();
        }
    };

    conjoiners.implant(obj, 'test/implant.conf.json', conjoinerName)
    .then(function() {
        obj.val = value;
        test.equal(obj.val, value);
    }).done();
};
