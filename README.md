# conjoiners - multi-platform / multi-language reactive programming library

conjoiners is a library aiming to enable reactive programming for
existing (or new) systems written in different languages and running
on different platforms. conjoiners is minimally invasive in its
programming model, but complex behind the scenes.

Idea and first implementations are done by me, Pavlo Baron (pavlobaron).

This is the Node.js implementation. General project description can be
found in the [conjoiners repository](https://github.com/conjoiners/conjoiners).

## How does it work?

conjoiners for Node.js follows the conjoiners simplicity of use an
non-invasiveness. In order to add an implant to an object, you call:

    var conjoiners = require('conjoiners')
    conjoiners.implant(cj1, "../test/test_conf.json", "test");
    
The first parameter of the implant function is the object itself. The
second is the nest configuration file path. The third is the name of
this conjoiner that can be found in the configuration.

From here, any time you set a field value in this object, a
transenlightenment will be propagated to all known conjoiners. Any
time you access a value, it will return the most current one,
eventually set through a transenlightenment from other
conjoiner. That's basically it.

Internally, conjoiners for Node.js works through monkey patching the
object provided to the implant function call. There is also a pretty weird loop implemented through timers in
order to observe new properties in the object. This is because it's
not possible in ECMAScript to have a generic catch-all setter/getter
for any value.

This library bring some dependencies: nodeunit is used for unit
tests. And of course zmq as the 0MQ interface. So you would need both
of them.

To run the tests, just run bin/test_it.sh. Look there for complete,
yet simple examples.
