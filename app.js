/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */

'use strict';

var _ = require('lodash'),
    express = require('express'),
    config = require('./config/config'),
    http = require('http');
http.globalAgent.maxSockets = 100;

var app = express(),
    server = null;


require('./config/express')(app, config);
require('./config/routes')(app, config);

var loadRecordsets = require("./app/lib/load-recordsets.js")(app, config);
var loadIndexTerms = require("./app/lib/load-index-terms.js")(app, config).loadIndexTerms;

function loadRSDelay() {
    loadRecordsets();
    setTimeout(loadRSDelay, 1000 * 60 * 60);
}

function loadITDelay() {
    loadIndexTerms();
    setTimeout(loadITDelay, 1000 * 60 * 60);
}

function startThisProcess() {
  return app.listen(config.port, function() {
    loadRSDelay();
    loadITDelay();
    console.log('Express server listening on port ' + server.address().port);
  });
}

function registerGracefulShutdown(signal) {
  process.on(signal, function() {
    console.log("Received shutdown signal, attempt exit");
    server.close(function() {
      console.log("app.close finished, exiting");
      process.exit(0);
    });
  });
}

if (config.ENV === "test" || !config.CLUSTER) {
  server = startThisProcess();
  registerGracefulShutdown('SIGTERM');
  registerGracefulShutdown('SIGINT');
} else {
  var cluster = require('cluster');

  if (cluster.isMaster) {
    // Fork workers.
    _.times(config.CLUSTER_WORKERS, function() { cluster.fork(); });

    cluster.on('exit', function(deadWorker, code, signal) {
      // Restart the worker
      var worker = cluster.fork();

      // Note the process IDs
      var newPID = worker.process.pid;
      var oldPID = deadWorker.process.pid;

      // Log the event
      console.log('worker ' + oldPID + ' died.');
      console.log('worker ' + newPID + ' born.');
    });
  } else {
    server = startThisProcess();
  }
}

module.exports = {
    app: app,
    server: server,
    config: config
};
