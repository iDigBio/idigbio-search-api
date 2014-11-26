"use strict";

var request = require('request');
var _ = require('lodash');

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var formatter = require("../lib/formatter.js")(app,config);
    var cp = require("../lib/common-params.js")(app,config);

    var required_fields = ["data.idigbio:version", "data.idigbio:etag", "data.idigbio:recordIds"];

    return {
        media: function(req, res) {

            var mq = cp.query("mq", req);

            var rq = cp.query("rq", req);

            var limit = cp.limit(req);

            var offset = cp.offset(req);

            var sort = cp.sort(req);

            var fields = cp.fields(req);
            if (_.isArray(fields)) {
                fields.push.apply(fields,required_fields);
            }

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
            if (_.isArray(fields)) {
                query["_source"] = fields;
            }

            request.post({
                url: config.search.server + config.search.index + "mediarecords/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.basic(body,res);
            });
        },

        basic: function(req, res) {

            var rq = cp.query("rq", req);

            var limit = cp.limit(req);

            var offset = cp.offset(req);

            var sort = cp.sort(req);

            var fields = cp.fields(req);
            if (_.isArray(fields)) {
                fields.push.apply(fields,required_fields);
            }

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
            if (_.isArray(fields)) {
                query["_source"] = fields;
            }

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.basic(body,res);
            });
        },
    };
};