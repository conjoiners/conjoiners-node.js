var conjoiners = require('conjoiners');

function Test() {
};

var iyes = new Test();
var ino = new Test();
conjoiners.implant(iyes, "../test/test_conf.json", "test");

exports.test_no_implant = function(test) {
    test.expect(1);
    ino.test_value = "no_implant_value";
    test.equal(ino.test_value, "no_implant_value");
    test.done();
};

exports.test_implant = function(test) {
    test.expect(1);
    iyes.test_value = "implant_value"; 
    var afterSleep = function() {
        test.equal(iyes.test_value, "implant_value");
        test.done();
    };

    setTimeout(afterSleep, 1100);
};

setTimeout(process.exit, 2000);
