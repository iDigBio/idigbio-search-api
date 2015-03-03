"use strict";

var request = require('request');
var _ = require('lodash');

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var formatter = require("../lib/formatter.js")(app,config);
    var cp = require("../lib/common-params.js")(app,config);
    var getParam = require("../lib/get-param.js")(app,config);
    var qg = require("../lib/query-generators.js")(app,config);

    function top_fields_agg(top_fields,top_count) {
        var top_agg = {};
        top_fields.reverse().forEach(function(f){
            var new_top_agg = {}
            new_top_agg["top_"+f] = {
                "terms": {
                    "field": f,
                    "size": top_count
                }
            }
            if (Object.keys(top_agg).length > 0) {
                new_top_agg["top_" + f]["aggs"] = top_agg;
            }
            top_agg = new_top_agg;
        });
        return top_agg;
    }

    return {
        top_media: function(req, res, next) {

            var mq = cp.query("mq", req);

            var rq = cp.query("rq", req);

            var query = qg.media_query(rq,mq,[],[],0,0)

            var top_fields = cp.top_fields(req);
            if (!top_fields) {
                top_fields = ["flags"]
            }

            var top_count = cp.top_count(req);

            query.aggs = top_fields_agg(top_fields,top_count);

            request.post({
                url: config.search.server + config.search.index + "mediarecords/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.top_formatter(body,res);
            });
        },

        top_basic: function(req, res, next) {

            var rq = cp.query("rq", req);

            var query = qg.record_query(rq,[],[],0,0);

            var top_fields = cp.top_fields(req);
            if (!top_fields) {
                top_fields = ["scientificname"]
            }

            var top_count = cp.top_count(req);

            query.aggs = top_fields_agg(top_fields,top_count);

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.top_formatter(body,res);
            });
        },

        count_media: function(req, res, next) {

            var mq = cp.query("mq", req);

            var rq = cp.query("rq", req);

            var query = qg.media_query(rq,mq,undefined,undefined,undefined,undefined)

            delete query["aggs"];

            request.post({
                url: config.search.server + config.search.index + "mediarecords/_count",
                body: JSON.stringify(query)
            },function (error, response, body) {
                var bo = JSON.parse(body)
                res.json({
                    itemCount: bo.count
                });
            });
        },

        count_basic: function(req, res, next) {

            var rq = cp.query("rq", req);

            var query = qg.record_query(rq,undefined,undefined,undefined,undefined);

            delete query["aggs"];

            request.post({
                url: config.search.server + config.search.index + "records/_count",
                body: JSON.stringify(query)
            },function (error, response, body) {
                var bo = JSON.parse(body)
                res.json({
                    itemCount: bo.count
                });
            });
        },

        count_recordset: function(req, res, next) {

            var rsq = cp.query("rsq", req);

            var query = qg.record_query(rsq,undefined,undefined,undefined,undefined);

            delete query["aggs"];

            request.post({
                url: config.search.server + config.search.index + "recordsets/_count",
                body: JSON.stringify(query)
            },function (error, response, body) {
                var bo = JSON.parse(body)
                res.json({
                    itemCount: bo.count
                });
            });
        },

        date_hist: function(req, res, next) {

            var rq = cp.query("rq", req);

            var query = qg.record_query(rq,[],[],0,0);

            var dateField = getParam(req,"dateField",function(p){
               return p;
            },"datecollected");

            var minDate = getParam(req,"minDate",function(p){
               return p;
            },"1700-01-01");

            var maxDate = getParam(req,"maxDate",function(p){
               return p;
            },"now");

            var dateInterval = getParam(req,"dateInterval",function(p){
               return p;
            },"year");

            var top_fields = cp.top_fields(req);
            if (!top_fields) {
                top_fields = []
            }

            var top_count = cp.top_count(req);

            var top_agg = top_fields_agg(top_fields,top_count);

            var rf = {};
            rf[dateField] = {
                "gt": minDate,
                "lte": maxDate,
            }

            query.aggs = {
                "fdh": {
                    "filter": {
                        "range": rf
                    },
                    "aggs": {
                        "dh": {
                            "date_histogram": {
                                "field": dateField,
                                "interval": dateInterval,
                                "format": "yyyy-MM-dd"
                            },
                            "aggs": top_agg
                        }
                    }
                }
            }

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.date_hist_formatter(body,res);
            });
        },

        stats: function(req, res, next) {

            var query = {
                "size": 0
            };

            var t = req.params.t;

            var recordset = getParam(req,"recordset",function(p){
               return p;
            },undefined);

            var minDate = getParam(req,"minDate",function(p){
               return p;
            },"2014-01-01");

            var maxDate = getParam(req,"maxDate",function(p){
               return p;
            },"now");

            var dateInterval = getParam(req,"dateInterval",function(p){
               return p;
            },"year");

            var rf = {
                "harvest_date": {
                    "gte": minDate,
                    "lte": maxDate,
                }
            }

            var filt = {
                "range": rf
            };
            if (recordset) {
                filt = {
                    "and": [
                        {
                            "range": rf
                        },
                        {
                            "term": {
                                "recordset_id": recordset
                            }
                        }
                    ]
                }
            }

            query.aggs = {
                "fdh": {
                    "filter": filt,
                    "aggs": {
                        "dh": {
                            "date_histogram": {
                                "field": "harvest_date",
                                "interval": dateInterval,
                                "format": "yyyy-MM-dd"
                            },
                            "aggs": {
                                "rs": {
                                    "terms": {
                                        "field": "recordset_id",
                                        "size": config.maxRecordsets
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (t == "fields" || t == "search") {
                query.aggs.fdh.aggs.dh.aggs.rs.aggs = {
                    "seen": {
                        "sum": {
                            "field": "seen.total"
                        }
                    },
                    "search": {
                        "sum": {
                            "field": "search.total"
                        }
                    },
                    "download": {
                        "sum": {
                            "field": "download.total"
                        }
                    },
                    // "viewed": {
                    //     "sum": {
                    //         "field": "viewed.total"
                    //     }
                    // }
                }
            } else if (t == "api" || t == "digest") {
                query.aggs.fdh.aggs.dh.aggs.rs.aggs = {
                    "records": {
                        "max": {
                            "field": "records_count"
                        }
                    },
                    "mediarecords": {
                        "max": {
                            "field": "mediarecords_count"
                        }
                    }
                }
            } else {
                res.status(400).json({
                    "error": "Bad Type"
                });
                return;
            }

            request.post({
                url: config.search.server + "stats/" + t + "/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.stats_hist_formatter(body,res);
            });
        }
    };
};