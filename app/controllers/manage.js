/**
 * This is controller hold some functionality for inspecting and
 * managing the state of a running search api server.
 */

"use strict";


var request = require('request');

module.exports = function(app, config) {
  var searchShim = require("../lib/search-shim.js")(app, config);
  var loadIndexTerms = require("../lib/load-index-terms.js")(app, config);
  var recordsets = require("../lib/recordsets.js")(app, config);

  return {
    listRecordsets: function(req, res, next) {
      res.json(config.recordsets);
      next();
    },
    reloadRecordsets: function(req, res, next) {
      recordsets.loadAll().then(function(rss) {
        res.json(rss);
        next();
      });
    },

    listIndexTerms: function(req, res, next) {
      res.json(config.indexterms);
      next();
    },
    reloadIndexTerms: function(req, res, next) {
      loadIndexTerms.loadIndexTerms()
        .then(function(indexterms) {
          res.json(indexterms);
          next();
        });
    },
  };
};
