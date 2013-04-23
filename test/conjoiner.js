'use strict';

var conjoiners = require('../lib/conjoiners');
var config = 'test/conjoiner.conf.json';

exports['simple inter-process communication'] = function(test) {
    test.expect(8);

    var value = 'test_value';
    var cj1 = {};
    var cj1Name = 'test';
    var cj2 = {};

    conjoiners.implant(cj1, config, cj1Name).then(function() {
        return conjoiners.implant(cj2, 'test/conjoiner.conf.json', 'test2');
    }).then(function () {
        cj2.transenlightenment.on('val', function (event) {
            test.equal(event.property, 'val');
            test.equal(event.source, cj2);
            test.equal(event.value, value);
            test.equal(cj2.val, value);
        });
        cj2.transenlightenment.on(function (event) {
            test.equal(event.property, 'val');
            test.equal(event.source, cj2);
            test.equal(event.value, value);
            test.equal(cj2.val, value);
            test.done();
        });

        cj1.val = value;
    }).done();
};
