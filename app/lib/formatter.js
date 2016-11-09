"use strict";

var _ = require("lodash");
var async = require("async");

module.exports = function(app, config) {
  var getRecordset = require("../lib/recordsets.js")(app, config).get;

  function attribution(rss, cb) {
    async.mapSeries(rss, function(bucket, acb) {
      var rsid = bucket.key;
      var rsd = {
        "uuid": rsid,
        "itemCount": bucket.doc_count
      };
      getRecordset(rsid)
        .catch(function() { return null; })
        .then(function(rs) {
          _.defaults(rsd, rs);
          acb(null, rsd);
        });
    }, function(err, results) {
      cb(results);
    });
  }

  function basic(body, res, next, extra) {

    if(body.status === 400) {
      res.status(400).json({
        "error": "Bad Request"
      });
      next();
      return;
    }

    var lm_date = new Date(body.aggregations.max_dm.value);

    var rb = {
      "itemCount": body.hits.total,
      "lastModified": lm_date,
      "items": [],
      "attribution": []
    };

    body.hits.hits.forEach(function(hit) {
      var indexterms = _.cloneDeep(hit._source);
      if(indexterms["data"]) {
        delete indexterms["data"];
      }

      if(!hit._source.data) {
        hit._source.data = {};
      }

      rb.items.push({
        "uuid": hit._id,
        "type": hit._type,
        "etag": hit._source.etag,
        "version": hit._source.version,
        "data": hit._source.data,
        "recordIds": hit._source.recordIds,
        "indexTerms": indexterms,
      });
    });

    attribution(body.aggregations.rs.buckets, function(results) {
      rb.attribution = results;

      if(extra) {
        _.merge(rb, extra);
      }
      res.json(rb);
      next();
    });
  }

  function basicNoAttr(body, res, next, extra) {

    if(body.status === 400) {
      res.status(400).json({
        "error": "Bad Request"
      });
      next();
      return;
    }

    var rb = {
      "itemCount": body.hits.total,
      "items": []
    };

    body.hits.hits.forEach(function(hit) {
      var indexterms = _.cloneDeep(hit._source);
      delete indexterms["data"];
      rb.items.push({
        "uuid": hit._id,
        "type": hit._type,
        "etag": hit._source.etag,
        "version": hit._source.version,
        "data": hit._source.data,
        "recordIds": hit._source.recordIds,
        "indexTerms": indexterms,
      });
    });

    res.json(rb);
    next();
  }

  function top_aggs(b) {
    var bv = {};

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

  function top_formatter(body, res, next) {

    if(body.status === 400) {
      res.status(400).json({
        "error": "Bad Request"
      });
      next();
      return;
    }

    var rb = top_aggs(body.aggregations);
    rb["itemCount"] = body.hits.total;

    res.json(rb);
    next();
  }

  function date_hist_formatter(body, res, next) {

    if(body.status === 400) {
      res.status(400).json({
        "error": "Bad Request"
      });
      next();
      return;
    }

    var rb = { "dates": {} };
    body.aggregations.fdh.dh.buckets.forEach(function(b) {
      rb.dates[b.key_as_string] = top_aggs(b);
    });

    rb["itemCount"] = body.hits.total;
    rb["rangeCount"] = body.aggregations.fdh.doc_count;

    res.json(rb);
    next();
  }

  function stats_hist_formatter(body, res, next, inverted) {
    var rb = null;
    if(body.status === 400) {
      res.status(400).json({
        "error": "Bad Request"
      });
      next();
      return;
    }

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

    res.json(rb);
    next();
  }

  return {
    basic: basic,
    attribution: attribution,
    top_formatter: top_formatter,
    date_hist_formatter: date_hist_formatter,
    stats_hist_formatter: stats_hist_formatter,
    basicNoAttr: basicNoAttr
  };
};
