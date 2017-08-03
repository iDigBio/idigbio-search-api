/* eslint camelcase: "off", dot-notation: "off" */

import request from "request";
import logger from "logging";
import config from "config";


export default function(query, statsInfo, response) {
  const payload = {};
  try {
    if(statsInfo["type"] === "search") {
      const search_payload = {},
            seen_payload = {};

      response.aggregations.rs.buckets.forEach(function(b) {
        search_payload[b["key"]] = b["doc_count"];
      });

      response.hits.hits.forEach(function(h) {
        seen_payload[h._id] = h._source.recordset;
      });

      payload["seen_payload"] = seen_payload;
      payload["search_payload"] = search_payload;
    } else if(statsInfo["type"] === "mapping") {
      response.aggregations.rs.buckets.forEach(function(b) {
        payload[b["key"]] = b["doc_count"];
      });
    } else if(statsInfo["type"] === "view") {
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
        source: statsInfo["source"] || "api-" + config.ENV,
        payload: payload
      };

      request.post({
        url: "http://idb-redis-stats.acis.ufl.edu:3000",
        body: JSON.stringify(stats)
      }, function(error, response, body) {
        if(error) {
          logger.error("Failed posting stats", error);
        }
      });
    }
  } catch (e) {
    logger.error("Stats error:", e);
  }
}
