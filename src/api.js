/* eslint no-process-env: "off" */

import KoaRouter from 'koa-router';

import config from 'config';

const api = KoaRouter();

api.get('/healthz', function(ctx) {
  ctx.cacheControl(0);
  ctx.body = {
      ENV: config.ENV,
      path: ctx.originalUrl,
      version: process.env.npm_package_version,
      index: config.search.index,
      maxRecordsets: config.maxRecordsets,
      defaultLimit: config.defaultLimit,
      maxLimit: config.maxLimit,
      maxTileObjects: config.maxTileObjects
  };
});

export default api;
