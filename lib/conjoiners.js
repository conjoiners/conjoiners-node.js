var zmq = require('zmq');
var util = require('util');
var events = require('events');
var fs = require('fs');

var TMLOOP = 'conjoiners_time_loop';

/*
  This is just stupid - there is no way in JS to have a catch-all getter/setter
  like in Python. This leads to an evil hack observing object's properties every
  TM milliseconds and post-reacting on new ones adding them to implant's
  communication. This can be 'fixed' when we have a list of those variables a
  conjoiner is interested in - having fixed names will allow to use
  __defineGetter__ / Setter. Right now, it has a latency up to 1 sec to know a
  new value - an unknown or even a known one.

  It is thus better to have declared fields in the class that will be hooked
  instead of working with completely dynamic ones.

  What also can be done: consider only declared fields as 'interested in' and
  just ignore   the rest.
*/

var TM = 1000;
var KEYS = 'conjoiners_keys';
var VALS = 'conjoiners_values';
var PRFX = 'conjoiners_';
var EVENTER = 'conjoiners_eventer';
var CONS = 'conjoiners_connections';
var SET = 'set_';
var MULT = 'multicast';
var EXTS = 'conjoiners_ext_sock';

exports.implant = function(o, cfgFile, myName, callback) {
    'use strict';

    fs.readFile(cfgFile, { encoding: 'utf8' }, function(err, data) {
        if (err) {
            throw err;
        }

        var conf = JSON.parse(data);

        var keyN = function(n) {
            return SET + n;
        };

        var myUrl = function() {
            for (var c in conf.conjoiners) {
                if (conf.conjoiners[c].name === myName) {
                    return conf.conjoiners[c].url;
                }
            }

            return undefined;
        };

        var packPayloadSingle = function(n, v) {
            var ret = {'sender': myName, 'time': new Date().getTime()};
            ret[keyN(n)] = v;

            return ret;
        };

        var unpackPayloadSingle = function(payload) {
            for (var c in payload) {
                if (c.substring(0, SET.length) === SET) {
                    var ret = {};
                    ret['n'] = c.replace(SET, '');
                    ret['v'] = payload[c];

                    return ret;
                }
            }

            return undefined;
        };

        // prepare PUB
        var ensureExternalBind = function() {
            var sock = zmq.socket('pub');
            sock.bind(myUrl());
            o[EXTS] = sock;
        };

        // hook getters and setters
        var ensureHook = function(n) {
            // override the getter
            o.__defineGetter__(n, function() {
                // always return the current value.
                // there is no concurrency in the event loop,
                // so there is no need to coordinate through a queue
                // or anyhow at all
                return o[VALS][o[KEYS].indexOf(n)];
            });

            // override the setter
            o.__defineSetter__(n, function(v) {
                // just store the value - no concurrency in the event loop
                o[VALS][o[KEYS].indexOf(n)] = v;

                // emit to everyone listening
                o[EVENTER].emit(MULT, packPayloadSingle(n, v));
            });
        };

        // connect to conjoiners and prepare multicasting
        var ensureConjoinersConnect = function() {
            // yet quite anemic multicaster
            var Multicaster = function() {
                this.on('newListener', function() {
                    // nothing to do yet
                });

                // multicast (through simple PUB)
                this.on(MULT, function(payload) {
                    o[EXTS].send(JSON.stringify(payload), zmq.NOBLOCK);
                });
            };

            util.inherits(Multicaster, events.EventEmitter);
            o[EVENTER] = new Multicaster();

            // connect to other conjoiners
            o[CONS] = [];
            for (var c in conf.conjoiners) {
                if (conf.conjoiners[c].name !== myName) {
                    var con = zmq.socket('sub');
                    con.connect(conf.conjoiners[c].url);
                    con.subscribe('');

                    // TODO: recv_timeout: where to set?
                    con.on('message', function(payload) {
                        var opayload = JSON.parse(payload.toString());
                        // later: internalize time
                        var res = unpackPayloadSingle(opayload);

                        // in case the variable is unknown, hook it first
                        ensureHook(res.n);

                        // set value directly to avoid the setter,
                        // thus multicast
                        o[VALS][o[KEYS].indexOf(res.n)] = res.v;
                    });
                    o[CONS].push(con);
                }
            }
        };

        /*
          use recursive setTimout instead of setInterval, because it's soft
          on busy servers and only will call the function when the event comes
          through, not at any cost even when events can't be handled.

          TODO: beware of maximum stack size through recursion - check
        */

        o[KEYS] = [];
        o[VALS] = [];
        o[TMLOOP] = function() {
            for (var k in o) {
                if (o[KEYS].indexOf(k) === -1 &&
                        typeof(o[k]) !== 'function' &&
                        k.substring(0, PRFX.length) !== PRFX) {
                    o[KEYS].push(k);
                    var v = o[k];
                    o[VALS].push(v);
                    delete o[k]; // from here, only use setter and getter

                    // hook it
                    ensureHook(k);

                    // read the current value and queue it. The current value
                    // will be multicasted to all other conjoiners.
                    o[k] = v;
                }
            }

            setTimeout(o[TMLOOP], TM);
        };

        // start the weird loop to observe new properties
        o[TMLOOP]();

        // wire global stuff
        ensureExternalBind();
        ensureConjoinersConnect();

        // inform about finished implanting
        if (callback != null) {
            callback(o);
        }
    });
};
