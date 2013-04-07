'use strict';

var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    test.expect(4);

    var obj = {};
    var value = 'implant_value';
    var conjoinerName = 'test_implant';

    conjoiners.implant(obj, 'test/conf.json', conjoinerName)
    .then(function(emitter) {

        // events should be emitted for local updates
        emitter.on('update', function(event) {
            test.equal(event.obj, obj);
            test.equal(event.property, 'val');
            test.equal(event.value, 'implant_value');
            test.done();
        });

        obj.val = value;
        test.equal(obj.val, 'implant_value');
    }).done();
};
