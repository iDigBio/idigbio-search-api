/* eslint camelcase: "off", dot-notation: "off" */

import _ from "lodash";

import esclient from "./esclient.js";
import config from "../config";
import hash from "./lib/hasher";
import statsFromResponse from "./lib/statsFromResponse";
import {readMock, writeMock} from "./lib/searchMocks";

if(config.env === "test") {
  statsFromResponse = null;
}
var shim = null;

if(config.CI) {
  shim = readMock;
} else {
  const client = esclient();

  shim = async function(index, type, op, query, statsInfo) {
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
    let response = null;
    if(op === "_search") {
      response = await client.search(options);
      if(statsInfo && statsFromResponse) {
        statsFromResponse(query_only.query, statsInfo, response);
      }
    } else if(op === "_count") {
      response = await client.count(options);
    } else if(op === "_mapping") {
      response = await client.indices.getMapping(
        { index: index, type: type });

    } else {
      throw new Error("unsupported op");
    }
    if(config.GEN_MOCK) {
      var h = hash("sha256", [index, type, op, query]);
      writeMock(h, response);
    }
    return response;
  };
}

export default shim;
