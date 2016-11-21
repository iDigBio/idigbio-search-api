import adapt from 'koa-adapter';
import _ from 'lodash';

import config from "config";
import api from "api";

import * as recordsets from "lib/recordsets";
import * as indexterms from "lib/indexTerms";


api.get('/manage/recordsets/', function(ctx) {
  ctx.body = recordsets.recordsets;
});
api.get('/manage/recordsets/reload', async function(ctx) {
  await recordsets.loadAll();
  ctx.redirect("/manage/recordsets");
});

api.get('/manage/indexterms', function(ctx) {
  ctx.body = indexterms.indexterms;
});
api.get('/manage/indexterms/reload', async function(ctx) {
  indexterms.clear();
  await indexterms.loadIndexTerms();
  ctx.redirect("/manage/indexterms");
});
