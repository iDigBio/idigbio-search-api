"use strict";

var Promise = require('bluebird');

module.exports = function(app, config) {
  var searchShim = require("../lib/search-shim.js")(app, config);
  return Promise.promisify(searchShim);
};
