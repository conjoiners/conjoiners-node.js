'use strict';

var conjoiners = require('../lib/index');

exports['simple inter-process communication'] = function(test) {
    test.expect(4);

    var cj1 = {};
    var cj1Name = 'test';
    var cj2 = {};

    var value = 'test_value';

    conjoiners.implant(cj1, 'test/conf.json', cj1Name).then(function() {
        return conjoiners.implant(cj2, 'test/conf.json', 'test2');
    }).then(function (emitter) {
        emitter.on('update', function(event) {
            test.equal(event.obj, cj2);
            test.equal(event.property, 'val');
            test.equal(event.value, value);
        });

        cj1.val = 'test_value';

        setTimeout(function() {
            test.equal(cj2.val, value);
            test.done();
        }, 1500);
    }).done();
};

