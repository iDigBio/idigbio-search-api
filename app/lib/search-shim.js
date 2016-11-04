/* eslint camelcase: "off", dot-notation: "off" */

'use strict';

var request = require("request"),
    fs = require("fs"),
    elasticsearch = require("elasticsearch"),
    _ = require("lodash"),
    hasherJs = require("../lib/hasher.js");

module.exports = function(app, config) {
  var hasher = hasherJs(app, config);
  var  writeMock = function(h, body) {
    var b = _.cloneDeep(body);
    delete b.took;
    fs.writeFileSync("test/mock/" + h + ".json", JSON.stringify(b, null, 2));
  };

  var statsFromResponse = function(query, statsInfo, response) {
    var payload = {},
        search_payload = {},
        seen_payload = {};
    if(config.ENV !== "test") {
      try {
        if(statsInfo["type"] == "search") {

          response.aggregations.rs.buckets.forEach(function(b) {
            search_payload[b["key"]] = b["doc_count"];
          });

          response.hits.hits.forEach(function(h) {
            seen_payload[h._id] = h._source.recordset;
          });

          payload["seen_payload"] = seen_payload;
          payload["search_payload"] = search_payload;
        } else if(statsInfo["type"] == "mapping") {
          response.aggregations.rs.buckets.forEach(function(b) {
            payload[b["key"]] = b["doc_count"];
          });
        } else if(statsInfo["type"] == "view") {
          if(response.hits.hits.length > 0) {
            query = "view";
            payload[response.hits.hits[0]._id] = response.hits.hits[0]._source.recordset;
          }
        }

        if(Object.keys(payload).length > 0) {
          var stats = {
            type: statsInfo["type"],
            record_type: statsInfo["recordtype"],
            ip: statsInfo["ip"],
            query: query,
            source: "api-" + config.ENV,
            payload: payload
          };

          request.post(
            {
              url: "http://idb-redis-stats.acis.ufl.edu:3000",
              body: JSON.stringify(stats)
            }, function(error, response, body) {
              // console.log(error,body);
            }
          );
        }
      } catch (e) {
        console.log("Stats error:", e);
      }
    }
  };

  if(config.CI) {
    return function(index, type, op, query, cb, statsInfo) {
      var h = hasher.hash("sha256", [index, type, op, query]);
      try {
        var resp = JSON.parse(fs.readFileSync("test/mock/" + h + ".json"));
        cb(null, resp);
      } catch (err) {
        cb("No json mock for " + h, null);
      }
    };

  } else {
    var client;
    if(config.search.useEsClient) {
      var esconfig = _.cloneDeep(config.elasticsearch);

      esconfig.hosts = _.shuffle(esconfig.hosts);

      client = elasticsearch.Client(esconfig);
    }

    return function(index, type, op, query, cb, statsInfo) {
      var h = hasher.hash("sha256", [index, type, op, query]);

      if(op == "_count") {
        if(_.keys(query).length == 0) {
          query = {
            query: {
              match_all: {}
            }
          };
        }
      }

      if(config.search.useEsClient) {
        var query_only = {};

        if(!query) {
          query = {};
        }

        ["query", "aggs"].forEach(function(k) {
          if(query[k]) {
            query_only[k] = query[k];
          }
        });

        var options = {
          index: index,
          type: type,
          body: query_only
        };

        if(type == "_all") {
          delete options.type;
        }

        if(query._source) {
          var source_object = false;
          if(query._source.exclude) {
            options._sourceExclude = query._source.exclude;
            source_object = true;
          }
          if(query._source.include) {
            options._sourceInclude = query._source.include;
            source_object = true;
          }

          if(!source_object) { options._source = query._source; }
        }

        if(query.sort) {
          options.sort = [];
          query.sort.forEach(function(sd) {
            var k = _.keys(sd)[0];
            options.sort.push(k + ":" + sd[k].order);
          });
        }
        ["size", "from"].forEach(function(k) {
          if(query[k]) {
            options[k] = query[k];
          }
        });

        // console.log(JSON.stringify(options,undefined,2));

        if(op === "_search") {
          client.search(options, function(error, response) {
            if(config.GEN_MOCK) {
              writeMock(h, response);
            }
            if(statsInfo) {
              statsFromResponse(query_only.query, statsInfo, response);
            }
            cb(error, response);
          });
        } else if(op === "_count") {
          client.count(options, function(error, response) {
            if(config.GEN_MOCK) {
              writeMock(h, response);
            }
            cb(error, response);
          });
        } else if(op === "_mapping") {
          client.indices.getMapping(
            { index: index, type: type },
            function(error, response) {
              if(config.GEN_MOCK) {
                writeMock(h, response);
              }
              cb(error, response);
            });
        } else {
          cb("unsupported op", null);
        }
      } else {
        var search_url = config.search.server + "/" + index + "/" + type + "/" + op;
        if(type === "_all") {
          search_url = config.search.server + "/" + index + "/" + op;
        }

        if(op === "_mapping") {
          request.get({
            url: search_url
          }, function(error, response, body) {
            var b = JSON.parse(body);
            if(config.GEN_MOCK) {
              writeMock(h, b);
            }
            cb(error, b);
          });
        } else {
          request.post({
            url: search_url,
            body: JSON.stringify(query)
          }, function(error, response, body) {
            var b = JSON.parse(body);
            if(config.GEN_MOCK) {
              writeMock(h, b);
            }
            if(statsInfo) {
              statsFromResponse(query_only.query, statsInfo, response);
            }
            cb(error, b);
          });
        }
      }
    };
  }
};
