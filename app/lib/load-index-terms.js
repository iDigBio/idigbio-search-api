"use strict";

var _ = require('lodash');
var async = require('async');

module.exports = function(app, config) {
  var searchShim = require("../lib/search-shim.js")(app, config);

  var getSubKeys = function(mappingDict, fnPrefix) {
    var rv = {};
    var props = mappingDict["properties"];
    Object.keys(props).forEach(function(key) {
      if(props[key].type) {
        var typ = props[key].type;
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

  return {
    getSubKeys: getSubKeys,
    loadIndexTerms: function(cb) {
      searchShim(config.search.index, "_all", "_mapping", undefined, function(err, mapping) {
        var resp = {};
        _.keys(mapping).forEach(function(index) {
          _.keys(mapping[index]["mappings"]).forEach(function(t) {
            config.indexterms[t] = getSubKeys(mapping[index]["mappings"][t], "");
          });
        });

        if(cb) {
          cb();
        }
      });
    },
    checkTerms: function(type, term_list, only_missing) {
      var results = {};

      term_list.forEach(function(term) {
        var term_parts = term.split(".");
        var root = config.indexterms[type];

        // Don't try to validate terms with wildcards.
        if(term.indexOf("*") !== -1) {
          var te = true;
        } else {
          // Use every instead of forEach to get early termination
          var te = term_parts.every(function(term_part, i) {
            if(root[term_part]) {
              if(i === (term_parts.length - 1)) {
                return true;
              } else {
                root = root[term_part];
                return true;
              }
            } else {
              return false;
            }
          });
        }

        if(only_missing) {
          if(!te) {
            results[term] = te;
          }
        } else {
          results[term] = te;
        }
      });
      return results;
    }
  };
};
