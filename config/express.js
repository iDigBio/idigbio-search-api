"use strict";

var express = require('express');
var morgan = require('morgan');
var cors = require('cors');
var compress = require('compression');
var bodyParser = require('body-parser');

module.exports = function(app, config) {
  app.use(compress());
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  app.use(cors());
  if(config.ENV !== "test") {
    app.use(morgan('combined'));
  }
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    type: function(req) {
      return true;
    }
  }));
  // app.all('*', function(req, res, next) {
  //     res.header("Access-Control-Allow-Origin", "*");
  //     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //     next();
  // });
};
