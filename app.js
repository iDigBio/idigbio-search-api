 var cluster = require('cluster');
 var http = require('http');
  http.globalAgent.maxSockets = 100;  

var express = require('express'),
    config = require('./config/config');

var app = express();
var server;

require('./config/express')(app, config);
require('./config/routes')(app, config);

var loadRecordsets = require("./app/lib/load-recordsets.js")(app,config);
var loadIndexTerms = require("./app/lib/load-index-terms.js")(app,config).loadIndexTerms;

function loadRSDelay(){
    loadRecordsets();
    setTimeout(loadRSDelay,1000*60*60);
}

function loadITDelay(){
    loadIndexTerms();
    setTimeout(loadRSDelay,1000*60*60);
}

if (process.env.NODE_ENV != "test") {
    var numWorkers = 10;
    if (cluster.isMaster) {
      // Fork workers.
      for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
      }

      cluster.on('exit', function(deadWorker, code, signal) {
        // Restart the worker
        var worker = cluster.fork();

        // Note the process IDs
        var newPID = worker.process.pid;
        var oldPID = deadWorker.process.pid;

        // Log the event
        console.log('worker '+oldPID+' died.');
        console.log('worker '+newPID+' born.');
      });
    } else {
        server = app.listen(config.port, function() {

            loadRSDelay();
            loadITDelay();

            //console.log('Express server listening on port ' + server.address().port);
        });
    }
} else {
    server = app.listen(config.port, function() {

        loadRSDelay();
        loadITDelay();

        //console.log('Express server listening on port ' + server.address().port);
    });
}

module.exports = {
    app: app,
    server: server,
    config: config
}