var _ = require('lodash');

module.exports = function(app,config) {

    var queryShim = require('../lib/query-shim.js')(app,config);

    function media_query(rq,mq,fields,sort,limit,offset) {
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

        return query;
    }

    function record_query(rq,fields,sort,limit,offset) {
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

        return query;
    }

    return {
        media_query: media_query,
        record_query: record_query
    };
}