"use strict";

/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */
const _ = require('lodash');
const config = require('./config');
const src = config.ENV === 'production' ? './build/app' : './src/app';
const http = require('http');

http.globalAgent.maxSockets = 100;

require('babel-polyfill');

if(config.ENV === 'development') {
  // for development use babel/register for faster runtime compilation
  require('babel-register');
}

var server = null;
const app = require(src).default;

// var loadRecordsets = require("./app/lib/recordsets.js")(app, config).loadAll;
// var loadIndexTerms = require("./app/lib/load-index-terms.js")(app, config).loadIndexTerms;

// var jobs = [
//   {job: loadRecordsets, time: 1000 * 60 * 60},
//   {job: loadIndexTerms, time: 1000 * 60 * 60}
// ];

// var startJobs = function() {
//   _.each(jobs, function(jobDesc) {
//     var repeater = function() {
//       timer(jobDesc.job)()
//         .then(() => setTimeout(repeater, jobDesc.time));
//     };
//     setImmediate(repeater);
//   });
// };


function startThisProcess() {
  return app.listen(config.port, function() {
    // startJobs();  // TODO: start background jobs
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


if(config.ENV === "test" || config.ENV === "development" || !config.CLUSTER) {
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
