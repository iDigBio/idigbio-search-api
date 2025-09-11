/* eslint vars-on-top: "off" */
/* eslint no-process-exit: "off" */
/* eslint strict: "off" */

"use strict";

const _ = require("lodash");
const http2 = require("http2");
// http.globalAgent.maxSockets = 100; //obsolete in http/2


const config = require('./src/config');
let srcdir = null;
if(config.ENV === 'prod') {
  srcdir = './build';
} else {
  srcdir = './src';
  require('babel-register');
}

const loggingmod = require(`${srcdir}/logging`);
const logger = loggingmod.default;

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
  const appmod = require(`${srcdir}/app`);
  const app = appmod.default;
  
  return appmod.checkAppPrerequisitesAsync().then(
    () => new Promise(function (resolve, reject) {
      logger.info('App prerequisites check passed')

      id = id || 'main';
      return app.ready.then(function () {
        const server = http2.createServer(app.callback()); // Create an HTTP/2 server without SSL (SSL configured on the proxy)

        server.listen(config.port, function () {
          logger.info(`Server(${id}) listening on port ${config.port} with HTTP/2`);
        });
        registerGracefulShutdown('SIGTERM', server, id);
        registerGracefulShutdown('SIGINT', server, id);
        resolve(server);
      });
    }),
    (reason) => {
      logger.error('App prerequisites check failed');
      loggingmod.exitAfterFlushAndWait(1, 1000);
      throw new Error(reason);
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

/* If you're ever wondering why the application does not end on error:
 * (1) The version of Node.js in use might still allow unhandled promises
 * (2) There are open handles that Node.js does not want to close prematurely
 *     (uncomment code below to see them)
 */

//setInterval(() => {
//  console.debug('ActiveRequests:', process._getActiveRequests());
//  console.debug('ActiveHandles:', process._getActiveHandles());
//}, 2000);
