/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */

'use strict';

var _ = require('lodash'),
    express = require('express'),
    config = require('./config/config'),
    http = require('http'),
    timer = require('./app/lib/timer');
http.globalAgent.maxSockets = 100;

var app = express(),
    server = null;


require('./config/express')(app, config);
require('./config/routes')(app, config);

var loadRecordsets = require("./app/lib/recordsets.js")(app, config).loadAll;
var loadIndexTerms = require("./app/lib/load-index-terms.js")(app, config).loadIndexTerms;

var jobs = [
  {job: loadRecordsets, time: 1000 * 60 * 60},
  {job: loadIndexTerms, time: 1000 * 60 * 60}
];

var startJobs = function() {
  _.each(jobs, function(jobDesc) {
    var repeater = function() {
      timer(jobDesc.job)()
        .then(() => setTimeout(repeater, jobDesc.time));
    };
    setImmediate(repeater);
  });
};


function startThisProcess() {
  return app.listen(config.port, function() {
    startJobs();
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

if(config.ENV === "test" || !config.CLUSTER) {
  server = startThisProcess();
  registerGracefulShutdown('SIGTERM');
  registerGracefulShutdown('SIGINT');
} else {
  var cluster = require('cluster');

  if(cluster.isMaster) {
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
