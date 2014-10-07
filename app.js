var express = require('express'),
    config = require('./config/config');

var app = express();

require('./config/express')(app, config);
require('./config/routes')(app, config);

var loadRecordsets = require("./app/lib/load-recordsets.js")(app,config);

function loadRSDelay(){
    loadRecordsets();
    setTimeout(loadRSDelay,1000*60*60);
}

var server = app.listen(config.port, function() {

    loadRSDelay();    

    console.log('Express server listening on port ' + server.address().port);
});