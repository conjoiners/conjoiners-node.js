'use strict';

var Q = require('q');
var implant = require('../../lib/conjoiners').implant;
var streamify = require('./baconjs-adapter').streamify;

var configurationFilePath = 'conf.json';
var apiServer = {};
var webServer = {};
var monitor = {
    apiServerLoad: 0,
    webServerLoad: 0
};

Q.spread([
    implant(monitor, configurationFilePath, 'monitor'),
    implant(apiServer, configurationFilePath, 'api_server'),
    implant(webServer, configurationFilePath, 'web_server')
], function () {
    var monitorStreamer = streamify(monitor);

    simulateLoad(apiServer, 'apiServerLoad');
    simulateLoad(webServer, 'webServerLoad');

    toMonitorColorStream(monitorStreamer.apiServerLoad)
        .zip(toMonitorColorStream(monitorStreamer.webServerLoad))
        .throttle(500)
        .map(toMonitorString)
        .log();
});


var toMonitorColorStream = function (stream) {
    return stream.skipDuplicates().map(toColor);
};


var toColor = function (load) {
    var color = load > 60 ? 'red' : 'green';
    return color + ' (' + Math.round(load) + '%)';
};


var toMonitorString = function (colors) {
    return '> API: ' + colors[0] + '\n' +
        '> WEB: ' + colors[1];
};


var simulateLoad = function (object, property) {
    object[property] = Math.random() * 100;
    setTimeout(simulateLoad, 1000, object, property);
};
