/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */
/* eslint strict: "off" */

"use strict";

const _ = require("lodash");
const http = require("http");
http.globalAgent.maxSockets = 100;


const config = require('./src/config');
let appsrc = null;
if(config.ENV === 'prod') {
  appsrc = './build/app';
} else {
  appsrc = './src/app';
  require('babel-register');
}


function registerGracefulShutdown(signal, server, id) {
  process.on(signal, function() {
    console.log(`Server(${id}) received signal ${signal}, attempt exit`);
    server.close(function() {
      console.log(`Server(${id}) finished closing, exiting`);
      process.exit(0);
    });
  });
}

function startThisProcess(id) {
  id = id || 'main';
  const app = require(appsrc).default;
  const server = app.listen(config.port, function() {
    console.log(`Server(${id}) listening on port ${config.port}`);
  });
  registerGracefulShutdown('SIGTERM', server, id);
  registerGracefulShutdown('SIGINT', server, id);
  return server;
}


if(config.ENV === "test" || config.ENV === "development" || !config.CLUSTER) {
  startThisProcess();
} else {
  var cluster = require('cluster');

  if(cluster.isMaster) {
    // Fork workers.
    _.times(config.CLUSTER_WORKERS, function() { cluster.fork(); });

    cluster.on('exit', function(deadWorker, code, signal) {
      console.log(`Server(${deadWorker.process.pid}) died.`);
      // Restart the worker
      cluster.fork();
    });
  } else {
    startThisProcess(cluster.worker.process.pid);
  }
}
