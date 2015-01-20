var _ = require('lodash');

module.exports = function(app,config) {

    var queryShim = require('../lib/query-shim.js')(app,config);

    function hasTerms(path, d) {
        if(isKeyDefined(path, d)) {
            path.forEach(function(k){
                d = d[k];
            });
            return Object.keys(d).length > 0;
        }
        return false;
    }

    function isKeyDefined(path,wd){
        var rv = true
        path.forEach(function(k){
            if (!wd[k]) {
                rv = false;
            }
            wd = wd[k];
        });
        return rv;
    }

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

        if (hasTerms(["query","filtered","filter"], mrquery)) {
            query["query"]["filtered"]["filter"] = mrquery["query"]["filtered"]["filter"];
        }

        var recordQuery;

        if (hasTerms(["query","filtered","filter"], rquery) || hasTerms(["query","filtered","query"], rquery)) {
            recordQuery = {
                "has_parent" : {
                    "parent_type" : "records",
                    "query" : rquery["query"]
                }
            };
        }

        if (recordQuery) {
            if (hasTerms(["query","filtered","query"], mrquery)) {
                query["query"]["filtered"]["query"] = {
                    "bool": {
                        "must": [
                            recordQuery,
                            mrquery["query"]["filtered"]["query"]
                        ]
                    }
                };
            } else {
                query["query"]["filtered"]["query"] = recordQuery;
            }
        } else {
            if (hasTerms(["query","filtered","query"], mrquery)) {
                query["query"]["filtered"]["query"] = mrquery["query"]["filtered"]["query"];
            }
        }


        if (!hasTerms(["query","filtered","query"], query)) {
            delete query["query"]["filtered"]["query"]
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