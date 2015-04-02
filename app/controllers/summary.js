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
                formatter.top_formatter(body, res, next);
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
                formatter.top_formatter(body, res, next);
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
                next();
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
                next();
            });
        },

        modified_media: function(req, res, next) {

            var mq = cp.query("mq", req);

            var rq = cp.query("rq", req);

            var query = qg.media_query(rq,mq,undefined,undefined,undefined,undefined)

            query["size"] = 0
            query["aggs"] = {
                "max_dm": {
                    "max": {
                        "field": "datemodified"
                    }
                }
            }

            request.post({
                url: config.search.server + config.search.index + "mediarecords/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                var bo = JSON.parse(body)
                res.json({
                    itemCount: bo.hits.total,
                    lastModified: new Date(bo.aggregations.max_dm.value)
                });
                next();
            });
        },

        modified_basic: function(req, res, next) {

            var rq = cp.query("rq", req);

            var query = qg.record_query(rq,undefined,undefined,undefined,undefined);

            query["size"] = 0
            query["aggs"] = {
                "max_dm": {
                    "max": {
                        "field": "datemodified"
                    }
                }
            }

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                var bo = JSON.parse(body)
                res.json({
                    itemCount: bo.hits.total,
                    lastModified: new Date(bo.aggregations.max_dm.value)
                });
                next();
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
                next();
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
                formatter.date_hist_formatter(body, res, next);
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

            var inverted = getParam(req,"inverted",function(p){
                return p === "true";
            },false);

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

            var internal_aggs;

            if (t == "fields" || t == "search") {
                internal_aggs = {
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
                    "viewed_records": {
                        "sum": {
                            "field": "viewed.records.total"
                        }
                    },
                    "viewed_media": {
                        "sum": {
                            "field": "viewed.mediarecords.total"
                        }
                    }
                }
            } else if (t == "api" || t == "digest") {
                internal_aggs = {
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
                next();
                return;
            }

            if (inverted) {
                query.aggs = {
                    "fdh": {
                        "filter": filt,
                        "aggs": {
                            "rs": {
                                "terms": {
                                    "field": "recordset_id",
                                    "size": config.maxRecordsets
                                },
                                "aggs": {
                                    "dh": {
                                        "date_histogram": {
                                            "field": "harvest_date",
                                            "interval": dateInterval,
                                            "format": "yyyy-MM-dd"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                query.aggs.fdh.aggs.rs.aggs.dh.aggs = internal_aggs;
            } else {
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

                query.aggs.fdh.aggs.dh.aggs.rs.aggs = internal_aggs;
            }

            request.post({
                url: config.search.server + "stats/" + t + "/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.stats_hist_formatter(body, res, next, inverted);
            });
        }
    };
};