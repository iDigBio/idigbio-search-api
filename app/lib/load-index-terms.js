"use strict";

var _ = require('lodash');

module.exports = function(app,config) {
    var searchShim = require("../lib/search-shim.js")(app,config);

    var getSubKeys = function(mappingDict, fnPrefix) {
            var rv = {};
            var props = mappingDict["properties"];
            Object.keys(props).forEach(function(key){
                if (props[key].type) {
                    var typ = props[key].type;
                    // Can't decide if notifying of analyzer status is a good thing or not.
                    // if (props[key].analyzer && props[key].analyzer === "keyword") {
                    //     typ = "keyword";
                    // }
                    rv[key] = {
                        type: typ,
                        fieldName: fnPrefix + key
                    };
                } else if (props[key].properties) {
                    rv[key] = getSubKeys(props[key], fnPrefix + key + ".");
                }
            });
            return rv;
    }

    return {
        getSubKeys: getSubKeys,
        loadIndexTerms: function(cb){
            searchShim(config.search.index,"_all","_mapping",undefined,function(err,mapping){                
                var resp = {};
                _.keys(mapping).forEach(function(index){
                    _.keys(mapping[index]["mappings"]).forEach(function(t){
                        config.indexterms[t] = getSubKeys(mapping[index]["mappings"][t],"")
                    })
                })

                if (cb) {
                    cb();
                }            
            });  
        }
    }
};