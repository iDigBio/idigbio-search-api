module.exports = function(app,config) {
    var request = require("request");
    var elasticsearch = require("elasticsearch");
    var _ = require("lodash");

    var client;
    if (config.search.useEsClient) {
         client = elasticsearch.Client(_.cloneDeep(config.elasticsearch));
    }

    return function(index, type, op, query, cb){
        if (config.search.useEsClient) {
            var query_only = {};
            ["query","aggs"].forEach(function(k){
                if(query[k]) {
                    query_only[k] = query[k];
                }
            });

            var options = {
                    index: index,
                    type: type,
                    body: query_only
            }

            if (query._source) {
                var source_object = false;
                if (query._source.exclude) {
                    options._sourceExclude = query._source.exclude;
                    source_object = true;
                }
                if (query._source.include) {
                    options._sourceExclude = query._source.include;
                    source_object = true;
                }

                if(!source_object){
                    options._source = query._source;
                }
            }

            if (query.sort) {
                options.sort = [];
                query.sort.forEach(function(sd){
                    k = _.keys(sd)[0];
                    options.sort.push(k + ":" + sd[k].order)
                })
            }
            ["size","from"].forEach(function(k){
                options[k] = query[k]
            })

            if (op == "_search") {
                client.search(options, cb)
            } else if (op == "_count") {
                client.count(options, cb)
            } else if (op == "_mapping") {
                cb({})
            }
        } else {
            if(op == "_mapping") {
                request.get({
                    url: config.search.server + "/" + index + "/" + type + "/" + op
                },function (error, response, body) {
                    cb(error,JSON.parse(body));
                });
            } else {
                if (op == "_count") {
                    if (_.keys(query).length == 0) {
                        query = {
                            query: {
                                match_all: {}
                            }
                        }
                    }
                }
                request.post({
                    url: config.search.server + "/" + index + "/" + type + "/" + op,
                    body: JSON.stringify(query)
                },function (error, response, body) {
                    cb(error,JSON.parse(body));
                });
            }
        }
    }
}