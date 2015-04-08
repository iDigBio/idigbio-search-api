"use strict";

var request = require('request');

module.exports = function(app, config) {
    var searchShim = require("../lib/search-shim.js")(app,config);

    function getSubKeys(mappingDict, fnPrefix) {
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
        index: function(req, res, next) {
            res.json({
                'v1': req.protocol + '://' + req.get("host") + '/v1',
                'v2': req.protocol + '://' + req.get("host") + '/v2',
            });
            next();
        },
        v2: function(req, res, next) {
            res.json({
                'search': req.protocol + '://' + req.get("host") + '/v2/search',
                'mapping': req.protocol + '://' + req.get("host") + '/v2/mapping',
                'view': req.protocol + '://' + req.get("host") + '/v2/view',
            });
            next();
        },
        v1: function(req, res, next) {
            //console.log("http://api.idigbio.org" + req.originalUrl)
            request.get("http://api.idigbio.org" + req.originalUrl,function(error, response, body) {
                res.json(JSON.parse(body));
                next();
            });
        },
        searchProxy: function(req, res, next) {
            var pa = req.originalUrl.split("?")[0].split("/");
            var t = pa[2];
            var op = pa[3];
            searchShim(config.search.index,t,op,req.query,function(err,body){
                if(err) {
                    next(err)
                } else {
                    res.json(body);
                    next();
                }
            });
        },
        searchProxyPost: function(req, res, next) {
            var pa = req.originalUrl.split("?")[0].split("/");
            var t = pa[2];
            var op = pa[3];
            searchShim(config.search.index,t,op,req.body,function(err,body){
                if(err) {
                    next(err)
                } else {
                    res.json(body);
                    next();
                }
            });
        },
        indexFields: function(req, res, next) {
            var t = req.params.t;

            if (t == "media") {
                t = "mediarecords";
            }

            searchShim(config.search.index,t,"_mapping",undefined,function(err,mapping){
                var resp = {};
                Object.keys(mapping).forEach(function(index){
                    resp = getSubKeys(mapping[index]["mappings"][t], "");
                });
                if(err) {
                    next(err)
                } else {
                    res.json(resp);
                    next();
                }
            });
        }
    };
};