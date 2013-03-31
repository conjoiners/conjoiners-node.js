var conjoiners = require('../lib/conjoiners');

exports['values should be accessible on implanted obj'] = function(test) {
    test.expect(1);

    var obj = {};
    conjoiners.implant(obj, "test/conf.json", "test", function() {
        obj.test_value = "implant_value";
        var afterSleep = function() {
            test.equal(obj.test_value, "implant_value");
            test.done();
        };

        setTimeout(afterSleep, 1100);
    });
};

setTimeout(process.exit, 2000);
