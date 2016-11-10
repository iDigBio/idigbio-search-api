/* eslint camelcase: "off", dot-notation: "off" */

'use strict';

var request = require("request"),
    elasticsearch = require("elasticsearch"),
    _ = require("lodash");

module.exports = function(app, config) {
  if(config.CI) {
    return require('./search-mocks')(app, config).readMock;
  }
  var writeMock = config.GEN_MOCK && require('./search-mocks')(app, config).writeMock;

  var hasher = require("../lib/hasher")(app, config);
  var statsFromResponse =
      config.ENV === 'test' ? function() {} : require('./response-stats')(app, config);

  var esconfig = _.cloneDeep(config.elasticsearch);
  esconfig.hosts = _.shuffle(esconfig.hosts);
  var client = new elasticsearch.Client(esconfig);

  return function(index, type, op, query, cb, statsInfo) {
    var h = hasher.hash("sha256", [index, type, op, query]);
    var query_only = {};

    if(op === "_count") {
      if(_.keys(query).length === 0) {
        query = {
          query: {
            match_all: {}
          }
        };
      }
    }

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

    if(type === "_all") {
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
        if(writeMock) {
          writeMock(h, response);
        }
        if(statsInfo) {
          statsFromResponse(query_only.query, statsInfo, response);
        }
        cb(error, response);
      });
    } else if(op === "_count") {
      client.count(options, function(error, response) {
        if(writeMock) {
          writeMock(h, response);
        }
        cb(error, response);
      });
    } else if(op === "_mapping") {
      client.indices.getMapping(
        { index: index, type: type },
        function(error, response) {
          if(writeMock) {
            writeMock(h, response);
          }
          cb(error, response);
        });
    } else {
      cb("unsupported op", null);
    }
  };
};
