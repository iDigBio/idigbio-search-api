/* eslint max-params: "off" */
/* eslint max-statements: "off" */
/* eslint new-cap: "off" */
/* eslint newline-per-chained-call: "off" */
/* eslint no-else-return: "off" */
/* eslint no-empty: "off" */
/* eslint no-inline-comments: "off" */
/* eslint no-plusplus: "off" */
/* eslint no-sync: "off" */
/* eslint radix: "off" */
/* eslint require-jsdoc: "off" */

// import _ from 'lodash';

import config from "config";
import api from "api";
import cache from "cache";

import * as formatter from "lib/formatter.js";
import * as cp from "lib/common-params.js";
import searchShim from "searchShim.js";
import {media_query, record_query, bare_query} from "lib/query-generators.js";
import getParam from "lib/get-param.js";
import {checkTerms} from "lib/indexTerms";
import {queryStats} from "lib/clickhouse-shim.js";


function top_fields_agg(top_fields, top_count) {
  var top_agg = {};
  top_fields.reverse().forEach(function(f) {
    var new_top_agg = {};
    new_top_agg["top_" + f] = {
      "terms": {
        "field": f,
        "size": top_count
      }
    };
    if(Object.keys(top_agg).length > 0) {
      new_top_agg["top_" + f]["aggs"] = top_agg;
    }
    top_agg = new_top_agg;
  });
  return top_agg;
}

const top_media = async function(ctx) {
  const mq = cp.query("mq", ctx.request);
  const rq = cp.query("rq", ctx.request);
  const query = media_query(rq, mq, [], [], 0, 0);
  const top_fields = cp.top_fields(ctx.request, "mediarecords") || ["flags"];
  const top_count = cp.top_count(ctx.request, top_fields.length);
  checkTerms('mediarecords', top_fields);
  query.aggs = top_fields_agg(top_fields, top_count);
  const key = ['top_media', query];
  ctx.body = await cache.wrap(key, async function() {
    const body = await searchShim(config.search.index, "mediarecords", "_search", query);
    return await formatter.top_formatter(body);
  });
};

const top_basic = async function(ctx) {
  const rq = cp.query("rq", ctx.request);
  const query = record_query(rq, [], [], 0, 0);
  const top_fields = cp.top_fields(ctx.request, "records") || ["scientificname"];
  const top_count = cp.top_count(ctx.request, top_fields.length);
  checkTerms('records', top_fields);
  query.aggs = top_fields_agg(top_fields, top_count);
  const key = ['top_basic', query];
  ctx.body = await cache.wrap(key, async function() {
    return searchShim(config.search.index, "records", "_search", query)
      .then(formatter.top_formatter);
  });
};

const top_recordsets = async function(ctx) {
  const rq = cp.query("rsq", ctx.request);
  const query = bare_query(rq, [], [], 0, 0);
  const top_fields = cp.top_fields(ctx.request) || ["publisher"];
  const top_count = cp.top_count(ctx.request, top_fields.length);
  checkTerms('recordsets', top_fields);
  query.aggs = top_fields_agg(top_fields, top_count);
  ctx.body = await cache.wrap(['top_recordsets', query], async function() {
    const body = await searchShim(config.search.index, "recordsets", "_search", query);
    return formatter.top_formatter(body);
  });
};

const count_media = async function(ctx) {
  const mq = cp.query("mq", ctx.request);
  const rq = cp.query("rq", ctx.request);
  const query = media_query(rq, mq);
  delete query["aggs"];

  const body = await searchShim(config.search.index, "mediarecords", "_count", query);
  ctx.body = {
    itemCount: body.count
  };
};

const count_basic = async function(ctx) {
  const rq = cp.query("rq", ctx.request);
  const query = record_query(rq);
  delete query["aggs"];

  const body = await searchShim(config.search.index, "records", "_count", query);
  ctx.body = {
    itemCount: body.count
  };

};

const modified_media = async function(ctx) {
  const mq = cp.query("mq", ctx.request);
  const rq = cp.query("rq", ctx.request);
  const query = media_query(rq, mq);

  query["size"] = 0;
  query["aggs"] = {
    "max_dm": {
      "max": {
        "field": "datemodified"
      }
    }
  };

  const body = await searchShim(config.search.index, "mediarecords", "_search", query);
  ctx.body = {
    itemCount: body.hits.total,
    lastModified: new Date(body.aggregations.max_dm.value)
  };

};

const modified_basic = async function(ctx) {
  const rq = cp.query("rq", ctx.request);
  const query = record_query(rq);

  query["size"] = 0;
  query["aggs"] = {
    "max_dm": {
      "max": {
        "field": "datemodified"
      }
    }
  };

  const body = await searchShim(config.search.index, "records", "_search", query);
  ctx.body = {
    itemCount: body.hits.total,
    lastModified: new Date(body.aggregations.max_dm.value)
  };

};

const count_recordset = async function(ctx) {
  const rsq = cp.query("rsq", ctx.request);
  const query = bare_query(rsq);

  delete query["aggs"];

  const body = await searchShim(config.search.index, "recordsets", "_count", query);
  ctx.body = {
    itemCount: body.count
  };
};

const date_hist = async function(ctx) {
  const rq = cp.query("rq", ctx.request);
  const query = record_query(rq, [], [], 0, 0);
  const dateField = getParam(ctx.request, "dateField", null, "datecollected");
  const minDate = getParam(ctx.request, "minDate", null, "1700-01-01");
  const maxDate = getParam(ctx.request, "maxDate", null, "now");
  const dateInterval = getParam(ctx.request, "dateInterval", null, "year");

  let top_fields = cp.top_fields(ctx.request, "records");
  if(!top_fields) {
    top_fields = [];
  }

  const top_count = cp.top_count(ctx.request, top_fields.length);

  const top_agg = top_fields_agg(top_fields, top_count);

  const rf = {};
  rf[dateField] = {
    "gt": "2022-10-01",
    "lte": "2023-10-01",
  };

  query.aggs = {
    "fdh": {
      "filter": {
        "range": rf
      },
      "aggs": {
        "dh": {
          "date_histogram": {
            "field": dateField,
            "interval": "year",
            "format": "yyyy-MM-dd"
          },
          "aggs": top_agg
        }
      }
    }
  };

  const body = await searchShim(config.search.index, "records", "_search", query);
  ctx.body = await formatter.date_hist_formatter(body);

};

const stats = async function(ctx) {
  const t = ctx.params.t;
  const recordset = getParam(ctx.request, "recordset");
  const minDate = getParam(ctx.request, "minDate", null, "2014-01-01");
  const maxDate = getParam(ctx.request, "maxDate", null, "now");
  const dateInterval = getParam(ctx.request, "dateInterval", null, "year");
  const inverted = cp.bool(ctx.request, "inverted", false);

  let minDateParse = new Date();
  let maxDateParse = new Date();

  try {
    // Parse minDate
    if(minDate === "now-1y") {
      minDateParse = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    } else if(minDate === "now-1d") {
      minDateParse = new Date(new Date().setDate(new Date().getDate() - 1));
    } else {
      minDateParse = new Date(minDate);
    }
    // Parse maxDate
    if(maxDate === "now") {
      maxDateParse = new Date(Date.now());
    } else {
      maxDateParse = new Date(maxDate);
    }
    // Check if dates are valid
    if(isNaN(minDateParse.getTime())) {
      throw new Error(`Invalid minDate: ${minDate}`);
    }
    if(isNaN(maxDateParse.getTime())) {
      throw new Error(`Invalid maxDate: ${maxDate}`);
    }
    // Check for negative date range
    if(minDateParse > maxDateParse) {
      throw new Error(`Invalid date range: minDate (${minDate}) is after maxDate (${maxDate})`);
    }
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Date parsing error',
      message: error.message
    };
    return;
  }

  const minDateOut = minDateParse.toISOString().split('T')[0];
  const maxDateOut = maxDateParse.toISOString().split('T')[0];
  const body = await queryStats(t, recordset, dateInterval, minDateOut, maxDateOut, inverted);
  ctx.body = await formatter.stats_ch_formatter(body, inverted, minDate);
};


api.get('/v2/summary/top/media', top_media);
api.post('/v2/summary/top/media', top_media);

api.get('/v2/summary/top/basic', top_basic);
api.post('/v2/summary/top/basic', top_basic);

api.get('/v2/summary/top/records', top_basic);
api.post('/v2/summary/top/records', top_basic);
api.get('/v2/summary/top/recordsets', top_recordsets);
api.post('/v2/summary/top/recordsets', top_recordsets);
api.get('/v2/summary/count/media', count_media);
api.post('/v2/summary/count/media', count_media);
api.get('/v2/summary/count/basic', count_basic);
api.post('/v2/summary/count/basic', count_basic);
api.get('/v2/summary/count/records', count_basic);
api.post('/v2/summary/count/records', count_basic);
api.get('/v2/summary/count/recordset', count_recordset);
api.post('/v2/summary/count/recordset', count_recordset);
api.get('/v2/summary/count/recordsets', count_recordset);
api.post('/v2/summary/count/recordsets', count_recordset);
api.get('/v2/summary/modified/media', modified_media);
api.post('/v2/summary/modified/media', modified_media);
api.get('/v2/summary/modified/records', modified_basic);
api.post('/v2/summary/modified/records', modified_basic);
api.get('/v2/summary/datehist', date_hist);
api.post('/v2/summary/datehist', date_hist);
api.get('/v2/summary/stats/:t', stats);
api.post('/v2/summary/stats/:t', stats);
