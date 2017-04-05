/* eslint camelcase: "off", dot-notation: "off", max-params: "off" */

import _ from "lodash";

import esclient from "esclient.js";
import config from "config";
import sfr from "lib/statsFromResponse";
import logger from "logging";

const statsFromResponse = config.ENV === "prod" && sfr;

export default async function searchShim(index, type, op, query, statsInfo) {
  const client = esclient();
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

  let response = null;
  if(op === "_search") {
    response = await client.search(options);
    if(statsInfo && statsFromResponse) {
      statsFromResponse(query_only.query, statsInfo, response);
    }
  } else if(op === "_count") {
    response = await client.count(options);
  } else if(op === "_mapping") {
    response = await client.indices.getMapping({ index, type });
  } else {
    throw new Error("unsupported op");
  }
  if(response.status === 400) {
    console.error("Bad ElasticSearch request: ", response["error"]);
    throw new Error("Bad ElasticSearch request");
  }
  return response;
}
