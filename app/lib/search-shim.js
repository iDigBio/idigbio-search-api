module.exports = function(app,config) {
    var request = require("request");
    var fs = require("fs");
    var elasticsearch = require("elasticsearch");
    var _ = require("lodash");
    var hasher = require("../lib/hasher.js")(app,config)

    function writeMock(h,body) {
        var b = _.cloneDeep(body);
        b.took = undefined
        var str = JSON.stringify(b,undefined,2);
        fs.writeFileSync("test/mock/" + h + ".json", str)
    }

    if (process.env.CI == "true") {
        return function(index,type,op,query,cb){
            var h = hasher.hash("sha256",[index,type,op,query]);
            try {
                var resp = JSON.parse(fs.readFileSync("test/mock/" + h + ".json"));
                cb(null,resp);
            } catch (err) {
                cb("No json mock for " + h, null);
            }
        }

    } else {
        var client;
        if (config.search.useEsClient) {
             client = elasticsearch.Client(_.cloneDeep(config.elasticsearch));
        }

        return function(index, type, op, query, cb){
            var h = hasher.hash("sha256",[index,type,op,query]);

            if (op == "_count") {
                if (_.keys(query).length == 0) {
                    query = {
                        query: {
                            match_all: {}
                        }
                    }
                }
            }

            if (config.search.useEsClient) {
                var query_only = {};

                if (!query) {
                    query = {};
                }

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
                        options.sort.push(k + ":" + sd[k].order);
                    });
                }
                ["size","from"].forEach(function(k){
                    if(query[k]) {
                        options[k] = query[k];
                    }
                });

                if (op == "_search") {
                    client.search(options, function(error,response){
                        if (process.env.GEN_MOCK == "true"){
                            writeMock(h,response);
                        }
                        cb(error,response);
                    })
                } else if (op == "_count") {
                    client.count(options, function(error,response){
                        if (process.env.GEN_MOCK == "true"){
                            writeMock(h,response);
                        }
                        cb(error,response)
                    })
                } else if (op == "_mapping") {
                    client.indices.getMapping({
                        index: index,
                        type: type
                    },function(error,response){
                        if (process.env.GEN_MOCK == "true"){
                            writeMock(h,response);
                        }
                        cb(error,response);
                    })
                } else {
                    cb("unsupported op", null);
                }
            } else {
                if(op == "_mapping") {
                    request.get({
                        url: config.search.server + "/" + index + "/" + type + "/" + op
                    },function (error, response, body) {
                        var b = JSON.parse(body)
                        if (process.env.GEN_MOCK == "true"){
                            writeMock(h,b);
                        }
                        cb(error,b);
                    });
                } else {
                    request.post({
                        url: config.search.server + "/" + index + "/" + type + "/" + op,
                        body: JSON.stringify(query)
                    },function (error, response, body) {
                        var b = JSON.parse(body)
                        if (process.env.GEN_MOCK == "true"){
                            writeMock(h,b);
                        }
                        cb(error,b);
                    });
                }
            }
        }
    }
}