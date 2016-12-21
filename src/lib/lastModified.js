import _ from "lodash";
import config from "config";
import searchShim from "searchShim";

import timer from "lib/timer";

var lastModified = null;
var lastModifiedByType = {};

export default function getLastModified(type) {
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
  lastModified = null;
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

export const updateLastModified = timer(async function() {
  try {
    const response = await searchShim(config.search.index, "_all", "_search", QUERY);
    console.log("Updating lastmodified, ES query took: ", response.took);
    const buckets = response['aggregations']['type']['buckets'];
    const diff = {};
    _.each(buckets, function(bucket) {
      const type = bucket.key,
            lm = new Date(bucket.lastModified.value);
      if(!lastModifiedByType[type] || lastModifiedByType[type].getTime() !== lm.getTime()) {
        diff[type] = lm;
      }
    });
    console.log("Found updates to lastModified:", diff);
    _.assign(lastModifiedByType, diff);
    lastModified = _.max(_.values(lastModifiedByType));
    return diff;
  } catch (e) {
    console.error("Failed updating last modified", e);
    return {};
  }
}, "update-last-modified");


// Example bucket response:
// {
//   "key": "records",
//   "doc_count": 74163497,
//   "lastModified": {
//     "value": 1481212706225,
//     "value_as_string": "2016-12-08T15:58:26.225Z"
//   }
// }
