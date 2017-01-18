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

import _ from 'lodash';

import config from "config";
import api from "api";

import * as formatter from "lib/formatter.js";
import * as cp from "lib/common-params.js";
import searchShim from "searchShim.js";
import {media_query, record_query, bare_query} from "lib/query-generators.js";


const required_fields = [];

const media = async function(ctx) {
  const mq = cp.query("mq", ctx.request);
  const rq = cp.query("rq", ctx.request);
  const limit = cp.limit(ctx.request);
  const offset = cp.offset(ctx.request);
  const sort = cp.sort(ctx.request);
  const fields = cp.fields(ctx.request, "mediarecords");
  if(_.isArray(fields)) {
    fields.push.apply(fields, required_fields);
  }

  const fields_exclude = cp.fields_exclude(ctx.request, "mediarecords");

  const no_attribution = cp.noattr(ctx.request);
  const extra = no_attribution ? { attribution: {} } : {};

  const query = media_query(rq, mq, fields, sort, limit, offset, fields_exclude);

  const body = await searchShim(config.search.index, "mediarecords", "_search", query, {
    type: "search",
    recordtype: "mediarecords",
    ip: ctx.ip,
  });
  // TODO: can this use basicNoAttr?
  ctx.body = await formatter.basic(body, extra);
};

const basic = async function(ctx) {
  const rq = cp.query("rq", ctx.request);
  const limit = cp.limit(ctx.request);
  const offset = cp.offset(ctx.request);
  const sort = cp.sort(ctx.request);
  const fields = cp.fields(ctx.request, "records");
  if(_.isArray(fields)) {
    fields.push.apply(fields, required_fields);
  }

  const fields_exclude = cp.fields_exclude(ctx.request, "records");
  const no_attribution = cp.noattr(ctx.request);
  const extra = no_attribution ? { attribution: {} } : {};

  const query = record_query(rq, fields, sort, limit, offset, fields_exclude);
  const body = await searchShim(config.search.index, "records", "_search", query, {
    type: "search",
    recordtype: "records",
    ip: ctx.ip,
  });
  ctx.body = await formatter.basic(body, extra);
};

const recordsets = async function(ctx) {
  const rsq = cp.query("rsq", ctx.request);
  const limit = cp.limit(ctx.request);
  const offset = cp.offset(ctx.request);
  const sort = cp.sort(ctx.request);
  const fields = cp.fields(ctx.request, "recordsets");
  if(_.isArray(fields)) {
    fields.push.apply(fields, required_fields);
  }

  const fields_exclude = cp.fields_exclude(ctx.request, "recordsets");

  const query = bare_query(rsq, fields, sort, limit, offset, fields_exclude);
  const body = await searchShim(config.search.index, "recordsets", "_search", query);
  ctx.body = await formatter.basicNoAttr(body);
};

const publishers = async function(ctx) {
  const pq = cp.query("pq", ctx.request);
  const limit = cp.limit(ctx.request);
  const offset = cp.offset(ctx.request);
  const sort = cp.sort(ctx.request);
  const fields = cp.fields(ctx.request, "publishers");
  if(_.isArray(fields)) {
    fields.push.apply(fields, required_fields);
  }

  const fields_exclude = cp.fields_exclude(ctx.request, "publishers");

  const query = bare_query(pq, fields, sort, limit, offset, fields_exclude);
  const body = await searchShim(config.search.index, "publishers", "_search", query);
  ctx.body = await formatter.basicNoAttr(body);
};

api.get('/v2/search', basic);
api.post('/v2/search', basic);
api.get('/v2/search/records', basic);
api.post('/v2/search/records', basic);

api.get('/v2/media', media);
api.post('/v2/media', media);
api.get('/v2/search/media', media);
api.post('/v2/search/media', media);

api.get('/v2/search/recordsets', recordsets);
api.post('/v2/search/recordsets', recordsets);

api.get('/v2/search/publishers', publishers);
api.post('/v2/search/publishers', publishers);
