"use strict";

var request = require('request');

module.exports = function(app, config) {
    var searchShim = require("../lib/search-shim.js")(app,config);

    var getSubKeys = require("../lib/load-index-terms.js")(app,config).getSubKeys;

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
            var i = pa[1];
            var t = pa[2];
            var op = pa[3];

            console.log(pa)

            searchShim(i,t,op,req.query,function(err,body){
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
            var i = pa[1];
            var t = pa[2];
            var op = pa[3];

            searchShim(i,t,op,req.body,function(err,body){
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