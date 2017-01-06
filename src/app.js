import _ from "lodash";
import bluebird from "bluebird";
import Koa from 'koa';

import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import compress from 'koa-compress';
import koaCtxCacheControl from 'koa-ctx-cache-control';

import jsonErrors from 'middleware/jsonErrors';
import lastModified from 'middleware/lastModified';
import logging from "middleware/logging";
import config from "config";
import api from 'api';
import "controllers/home";
import "controllers/view";
import "controllers/manage";
import "controllers/mapping";
import "controllers/search";
import "controllers/summary";

const compressionOpts = {
  filter: function(content_type) {
    return (/text/i).test(content_type);
  },
  threshold: 2048,
  flush: require('zlib').Z_SYNC_FLUSH
};



const app = new Koa();
app.name = "iDigBio Search API";
app.proxy = true;
app.port = config.port;
koaCtxCacheControl(app);
app
  .use(logging())
  .use(lastModified({maxAge: '5 minutes'}))
  .use(compress(compressionOpts))
  .use(jsonErrors())
  .use(cors())
  .use(bodyParser())
  .use(api.routes())
  .use(api.allowedMethods());

export default app;


/**
 * Keep things up to date with elasticsearch
 */

const repeatEvery = 5 * 60 * 1000;

import { updateLastModified } from "lib/lastModified";

const updateLastModifiedLoop = function() {
  updateLastModified()
    .then(function(diff) {
      _.forOwn((lastModified, type) => app.emit('lastmodified', {type, lastModified}));
      setTimeout(updateLastModifiedLoop, repeatEvery);
    });
};
if(config.ENV !== 'test') {
  updateLastModifiedLoop();
}

import {loadIndexTerms}  from "lib/indexTerms";
import {loadAll as loadRecordsets} from "lib/recordsets";
app.on('lastmodified', (evt) => loadIndexTerms(evt.type));
app.on('lastmodified', (evt) => {
  if(evt.type === 'recordsets') { loadRecordsets(); }
});

app.ready = bluebird.all([loadIndexTerms(), loadRecordsets()]);
