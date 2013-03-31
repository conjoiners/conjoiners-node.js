var conjoiners = require('../lib/conjoiners');

var cj1 = {};
var cj2 = {};
conjoiners.implant(cj1, "test/conf.json", "test");
conjoiners.implant(cj2, "test/conf.json", "test2");

exports.test_send = function(test) {
    test.expect(1);
    var firstSleep = function() {
        cj1.test_value = "test_value";
        setTimeout(secondSleep, 1000);
    };

    var secondSleep = function() {
        test.equal(cj2.test_value, "test_value");
        test.done();
    };

    setTimeout(firstSleep, 1500);
};

setTimeout(process.exit, 3000);
