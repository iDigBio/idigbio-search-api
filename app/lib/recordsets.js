"use strict";

var Promise = require('bluebird');

module.exports = function(app, config) {
  var searchShimProm = require("../lib/search-shim-promise.js")(app, config);
  var loading = null;

  function loadAll() {
    if(loading) { return loading; }
    loading = searchShimProm(config.search.index, "recordsets", "_search", {size: config.maxRecordsets})
      .then(function(body) {
        body.hits.hits.forEach(function(hit) {
          config.recordsets[hit._id] = {
            "name": hit._source.data.collection_name,
            "description": hit._source.data.collection_description,
            "logo": hit._source.data.logo_url,
            "url": hit._source.data.institution_web_address,
            "emllink": hit._source.emllink,
            "archivelink": hit._source.archivelink,
            "contacts": hit._source.data.contacts,
            "data_rights": hit._source.data.data_rights,
            "publisher": hit._source.publisher,
          };
        });
        return config.recordsets;
      })
      .catch(function(err) {
        console.error("Failed fetching recordsets", err);
      })
      .finally(function() {
        loading = null;
      });
    return loading;
  }

  function get(id) {
    var rs = config.recordsets[id];
    if(rs) {
      return Promise.resolve(rs);
    }
    return loadAll()
      .then(function(recordsets) {
        rs = recordsets[id];
        if(rs) {
          return rs;
        }
        throw new Error("Can't find recordset: " + id);
      });
  }

  function clearcache() {
    if(loading) {
      console.warn("Clearing recordset caches while loading is underway.");
      loading.then(function() {
        config.recordsets = {};
      });
    }
    config.recordsets = {};
  }

  return {loadAll, get, clearcache};
};
