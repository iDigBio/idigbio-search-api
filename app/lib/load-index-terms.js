"use strict";

var _ = require('lodash');

module.exports = function(app, config) {
  var searchShimProm = require("../lib/search-shim-promise.js")(app, config);

  var getSubKeys = function(mappingDict, fnPrefix) {
    var rv = {};
    var props = mappingDict["properties"];
    Object.keys(props).forEach(function(key) {
      var typ = props[key].type;
      if(typ) {
        // Can't decide if notifying of analyzer status is a good thing or not.
        // if (props[key].analyzer && props[key].analyzer === "keyword") {
        //     typ = "keyword";
        // }
        rv[key] = {
          type: typ,
          fieldName: fnPrefix + key
        };
      } else if(props[key].properties) {
        rv[key] = getSubKeys(props[key], fnPrefix + key + ".");
      }
    });
    return rv;
  };

  var loadIndexTerms = function() {
    return searchShimProm(config.search.index, "_all", "_mapping", null)
      .then(function(mapping) {
        _.forOwn(mapping, function(index, indexName) {
          _.forOwn(index["mappings"], function(mappingDict, t) {
            config.indexterms[t] = getSubKeys(mappingDict, "");
          });
        });
        return config.indexterms;
      });
  };
  var checkTerms =function(type, term_list, only_missing) {
    var results = {};
    var root = config.indexterms[type];

    term_list.forEach(function(term) {
      var termParts = term.split(".");

      // Don't try to validate terms with wildcards.
      var te  = term.indexOf("*") !== -1 ||
          termParts.every(function(termPart, i) {
            if(root[termPart]) {
              if(i === (termParts.length - 1)) {
                return true;
              }
              root = root[termPart];
              return true;
            }
            return false;
          });
      if(only_missing) {
        if(!te) {
          results[term] = te;
        }
      } else {
        results[term] = te;
      }
    });
    return results;
  };

  return {getSubKeys, loadIndexTerms, checkTerms};
};
