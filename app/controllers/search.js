"use strict";

var request = require('request');
var _ = require("lodash");

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var getParam = require("../lib/get-param.js")(app,config);
    var formatter = require("../lib/formatter.js")(app,config);

    return {
        media: function(req, res) {

            var mq = getParam(req,"mq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p);
                }
                return p;
            },{});

            var rq = getParam(req,"rq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p);
                }
                return p;
            },{});

            var limit = getParam(req,"limit",function(p){
                return Math.min(parseInt(p),config.maxLimit);
            },100);

            var offset = getParam(req,"offset",function(p){
                return parseInt(p);
            },0);

            var sort = getParam(req,"sort",function(p){
                var s = {};
                s[p] = {"order":"asc"};
                return [s,{"dqs":{"order":"asc"}}];
            },[{"dqs":{"order":"asc"}}]);         

            var rquery = queryShim(rq);
            var mrquery = queryShim(mq);

            var query = {
                "query": {
                    "filtered": {
                        "filter": {},
                        "query": {},
                    }
                }
            };

            if (mrquery["query"]["filtered"]["filter"]) {
                query["query"]["filtered"]["filter"] = mrquery["query"]["filtered"]["filter"];
            }

            if (mrquery["query"]["filtered"]["query"]) {
                query["query"]["filtered"]["query"] = {
                    "bool": {
                        "must": [
                            {
                                "has_parent" : {
                                    "parent_type" : "records",
                                    "query" : rquery["query"]
                                }
                            },
                            mrquery["query"]["filtered"]["query"]
                        ]
                    }
                };                
            } else {
                query["query"]["filtered"]["query"] = {
                    "has_parent" : {
                        "parent_type" : "records",
                        "query" : rquery["query"]
                    }
                };
            }
            
            query["aggs"] = {
                "rs": {
                    "terms": {
                        "field": "recordset",
                        "size": config.maxRecordsets
                    }
                }
            };
            query["from"] = offset;
            query["size"] = limit;
            query["sort"] = sort;

            request.post({
                url: config.search.server + config.search.index + "mediarecords/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.basic(body,res);
            });
        },

        basic: function(req, res) {

            var rq = getParam(req,"rq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p);
                }
                return p;
            },{});

            var limit = getParam(req,"limit",function(p){
                return Math.min(parseInt(p),config.maxLimit);
            },100);

            var offset = getParam(req,"offset",function(p){
                return parseInt(p);
            },0);            

            var sort = getParam(req,"sort",function(p){
                var s = {};
                s[p] = {"order":"asc"};
                return [s,{"dqs":{"order":"asc"}}];
            },[{"dqs":{"order":"asc"}}]);               

            var query = queryShim(rq);
            query["aggs"] = {
                "rs": {
                    "terms": {
                        "field": "recordset",
                        "size": config.maxRecordsets
                    }
                }
            };
            query["from"] = offset;
            query["size"] = limit;
            query["sort"] = sort;

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.basic(body,res);
            });
        },        
    };
};