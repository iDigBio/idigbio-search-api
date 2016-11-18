import proxy from 'koa-proxy';
import adapt from 'koa-adapter';
import _ from 'lodash';

import config from "../../config";
import api from "../api";
import searchShim from "../searchShim.js";

import {getMappingForType} from "../lib/indexTerms.js";


const index = async function(ctx, next) {
  const prot = ctx.request.protocol,
        host = ctx.request.host,
        base = `${prot}://${host}`;
  ctx.body = {
    v1: `${base}/v1`,
    v2: `${base}/v2`,
  };
};

const v1 = adapt(proxy({
  host: 'http://api.idigbio.org'
}));

const v2 = async function(ctx) {
  const prot = ctx.protocol,
        host = ctx.host,
        base = `${prot}://${host}`;
  ctx.body = {
    'search': base + '/v2/search',
    'mapping': base + '/v2/mapping',
    'view': base + '/v2/view',
  };
};

const searchProxy = async function(ctx, next) {
  const {index, t, op} = ctx.params;
  const query = ctx.method === 'GET' ? ctx.request.query : ctx.request.body;
  ctx.body = await searchShim(index, t, op, query);
};

const indexFields = async function(ctx) {
  let t = ctx.params.t;
  if(t === "media") {
    t = "mediarecords";
  }
  ctx.body = await getMappingForType(t);
};


api.get('/', index);
api.get('/v1*', v1);
api.get('/v2', v2);
api.get('/:index(stats|idigbio)/:t/:op(_search|_count)', searchProxy);
api.post('/:index(stats|idigbio)/:t/:op(_search|_count)', searchProxy);
api.get('/v2/meta/fields/:t', indexFields);
