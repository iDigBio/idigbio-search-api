var _ = require("lodash");
var bluebird = require("bluebird");

import * as recordsets from "lib/recordsets";
import logger from "logging";

export async function attribution(rss) {
  logger.debug("** in function 'attribution'");
  return await bluebird
    .map(rss, function(bucket) {
      var rsid = bucket.key;
      return recordsets.get(rsid)
        .catch(function() { return null; })
        .then(function(rs) {
          var rv = _.defaults({
            "uuid": rsid,
            "itemCount": bucket.doc_count
          }, rs);
          if(rv.itemCount && rv.totalCount) {
            rv["hitRatio"] = rv.itemCount / rv.totalCount;
          }
          return rv;
        });
    });
}

export async function basic(body, extra) {
  if(body.status === 400) {
    throw new Error("Bad Request");
  }

  const items  = _.map(body.hits.hits, function(hit) {
    var indexterms = _.cloneDeep(hit._source);
    if(indexterms["data"]) {
      delete indexterms["data"];
    }

    if(!hit._source.data) {
      hit._source.data = {};
    }
    return {
      "uuid": hit._id,
      "type": hit._type,
      "etag": hit._source.etag,
      "version": hit._source.version,
      "data": hit._source.data,
      "recordIds": hit._source.recordIds,
      "indexTerms": indexterms,
    };
  });
  const rb = {
    "itemCount": body.hits.total,
    "lastModified": new Date(body.aggregations.max_dm.value),
    "items": items,
    "attribution": await attribution(body.aggregations.rs.buckets)
  };
  return _.merge(rb, extra);
}


export async function basicNoAttr(body, extra) {
  if(body.status === 400) {
    throw new Error("Bad Request");
  }

  const items = _.map(body.hits.hits, function(hit) {
    var indexterms = _.cloneDeep(hit._source);
    delete indexterms["data"];
    return {
      "uuid": hit._id,
      "type": hit._type,
      "etag": hit._source.etag,
      "version": hit._source.version,
      "data": hit._source.data,
      "recordIds": hit._source.recordIds,
      "indexTerms": indexterms,
    };
  });
  return {
    "itemCount": body.hits.total,
    "items": items
  };
}


export function top_aggs(b) {
  const bv = {};
  if(b.doc_count) {
    bv["itemCount"] = b.doc_count;
  }

  Object.keys(b).forEach(function(k) {
    if(k.slice(0, 4) === "top_") {
      var ok = k.slice(4);
      bv[ok] = {};
      b[k].buckets.forEach(function(bk) {
        bv[ok][bk.key] = top_aggs(bk);
      });
    }
  });
  return bv;
}

export async function top_formatter(body) {
  const rb = top_aggs(body.aggregations);
  rb["itemCount"] = body.hits.total;
  return rb;
}

export async function date_hist_formatter(body) {
  const rb = {
    "dates": {},
    "itemCount": body.hits.total,
    "rangeCount": body.aggregations.fdh.doc_count
  };
  body.aggregations.fdh.dh.buckets.forEach(function(b) {
    rb.dates[b.key_as_string] = top_aggs(b);
  });
  return rb;
}

export async function stats_hist_formatter(body, inverted) {
  var rb = null;

  if(inverted) {
    rb = { "recordsets": {} };
    body.aggregations.fdh.rs.buckets.forEach(function(b) {
      var outer = {};
      b.dh.buckets.forEach(function(dhb) {
        var inner = {};
        Object.keys(dhb).forEach(function(f) {
          if(f !== "key" && f !== "doc_count" && f !== "key_as_string") {
            inner[f] = dhb[f]["value"];
            if(inner[f] == null) {
              inner[f] = 0;
            }
          }
        });
        if(Object.keys(inner).length > 0) {
          outer[dhb.key_as_string] = inner;
        }
      });
      if(Object.keys(outer).length > 0) {
        rb.recordsets[b.key] = outer;
      }
    });
  } else {
    rb = { "dates": {} };
    body.aggregations.fdh.dh.buckets.forEach(function(b) {
      var outer = {};
      b.rs.buckets.forEach(function(rsb) {
        var inner = {};
        Object.keys(rsb).forEach(function(f) {
          if(f !== "key" && f !== "doc_count") {
            inner[f] = rsb[f]["value"];
            if(inner[f] == null) {
              inner[f] = 0;
            }
          }
        });
        if(Object.keys(inner).length > 0) {
          outer[rsb.key] = inner;
        }
      });
      if(Object.keys(outer).length > 0) {
        rb.dates[b.key_as_string] = outer;
      }
    });
  }
  return rb;
}
