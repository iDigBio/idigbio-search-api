import _ from "lodash";
import config from "config";
import searchShim from "searchShim";

import logger from "logging";
import timer from "lib/timer";

var lastModified = null;
var lastModifiedByType = {};

export function getLastModified(type) {
  if(_.isArray(type)) {
    return _(type).map((t) => lastModifiedByType[t]).max();
  }
  if(type) {
    return lastModifiedByType[type];
  }
  return lastModified;
}

export function clear() {
  lastModifiedByType = {};
  lastModified = new Date();
}

const QUERY = {
  "size": 0,
  "aggs": {
    "type": {
      "terms": { "field": "_type" },
      "aggs": {
        "lastModified": {
          "max": { "field": "datemodified" }
        }
      }
    }
  }
};

export const updateLastModified = timer(async function updateLastModified() {
  try {
    const response = await searchShim(config.search.index, "_all", "_search", QUERY);
    const buckets = response['aggregations']['type']['buckets'];
    const diff = {};
    _.each(buckets, function(bucket) {
      const type = bucket.key,
            lm = new Date(bucket.lastModified.value);
      if(!lastModifiedByType[type] || lastModifiedByType[type].getTime() !== lm.getTime()) {
        diff[type] = lm;
      }
    });
    if(!_.isEmpty(diff)) {
      _.assign(lastModifiedByType, diff);
      logger.info("Found updates to lastModified: %j", diff);
      const dates = _.values(lastModifiedByType);
      dates.push(lastModified);
      lastModified = _.max(dates);
    }
    return diff;
  } catch (e) {
    logger.error("Failed updating last modified", e);
    return {};
  }
});


// Example bucket response:
// {
//   "key": "records",
//   "doc_count": 74163497,
//   "lastModified": {
//     "value": 1481212706225,
//     "value_as_string": "2016-12-08T15:58:26.225Z"
//   }
// }
