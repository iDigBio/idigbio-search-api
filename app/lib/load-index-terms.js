"use strict";

var _ = require('lodash');

module.exports = function(app, config) {
  var searchShim = require("../lib/search-shim.js")(app, config);

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

  return {
    getSubKeys: getSubKeys,
    loadIndexTerms: function(cb) {
      searchShim(config.search.index, "_all", "_mapping", null, function(err, mapping) {
        if(err) {
          if(cb) { cb(err); }
          return;
        }
        _.keys(mapping).forEach(function(index) {
          _.keys(mapping[index]["mappings"]).forEach(function(t) {
            config.indexterms[t] = getSubKeys(mapping[index]["mappings"][t], "");
          });
        });

        if(cb) { cb(); }
      });
    },
    checkTerms: function(type, term_list, only_missing) {
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
    }
  };
};
