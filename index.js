/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */
/* eslint strict: "off" */

"use strict";

const _ = require("lodash");
const http = require("http");
http.globalAgent.maxSockets = 100;


const config = require('./src/config');
let srcdir = null;
if(config.ENV === 'prod') {
  srcdir = './build';
} else {
  srcdir = './src';
  require('babel-register');
}

const logger = require(`${srcdir}/logging`).default;

logger.info("BEGIN LOGGING - SEVERITY = %s", config.LOGGER_LEVEL);
logger.info("Current environment: %s", config.ENV)

function registerGracefulShutdown(signal, server, id) {
  process.on(signal, function() {
    logger.info(`Server(${id}) received signal ${signal}, attempt exit`);
    server.close(function() {
      logger.info(`Server(${id}) finished closing, exiting`);
      process.exit(0);
    });
  });
}

function startThisProcess(id) {
  return new Promise(function(resolve, reject) {
    id = id || 'main';
    const app = require(`${srcdir}/app`).default;
    return app.ready.then(function() {
      const server = app.listen(config.port, function() {
        logger.info(`Server(${id}) listening on port ${config.port}`);
      });
      registerGracefulShutdown('SIGTERM', server, id);
      registerGracefulShutdown('SIGINT', server, id);
      resolve(server);
    });
  });
}


if(config.ENV === "test" || config.ENV === "development" || !config.CLUSTER) {
  startThisProcess();
} else {
  var cluster = require('cluster');

  if(cluster.isMaster) {
    // Fork workers.
    _.times(config.CLUSTER_WORKERS, function() { cluster.fork(); });

    cluster.on('exit', function(deadWorker, code, signal) {
      logger.warn(`Server(${deadWorker.process.pid}) died.`);
      // Restart the worker
      cluster.fork();
    });
  } else {
    startThisProcess(cluster.worker.process.pid);
  }
}
