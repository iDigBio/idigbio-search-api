"use strict";

/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */
const _ = require('lodash');
const config = require('./src/config');
const appsrc = config.ENV === 'prod' ? './build/app' : './src/app';
const http = require('http');

http.globalAgent.maxSockets = 100;

require('babel-polyfill');

if(config.ENV === 'development') {
  // for development use babel/register for faster runtime compilation
  require('babel-register');
}
const app = require(appsrc).default;

var server = null;


function startThisProcess() {
  return app.listen(config.port, function() {
    console.log('Server listening on port ', config.port);
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
