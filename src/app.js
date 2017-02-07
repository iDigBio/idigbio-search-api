import _ from "lodash";
import bluebird from "bluebird";
import Koa from 'koa';

import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import compress from 'koa-compress';
import koaCtxCacheControl from 'koa-ctx-cache-control';

import logger from "logging";
import jsonErrors from "middleware/jsonErrors";
import lastModified from "middleware/lastModified";
import prefixed from "middleware/prefixed";
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
  .use(compress(compressionOpts))
  .use(jsonErrors())
  .use(cors())
  .use(bodyParser());


app.use(prefixed({prefix: '/v2/'}, lastModified({maxAge: '5 minutes'})));
app.use(api.routes())
   .use(api.allowedMethods());

export default app;


/**
 * Keep things up to date with elasticsearch
 */

const repeatEvery = 5 * 60 * 1000;

import { updateLastModified, getLastModified } from "lib/lastModified";
import {loadIndexTerms}  from "lib/indexTerms";
import {loadAll as loadRecordsets} from "lib/recordsets";

const updateLastModifiedLoop = async function() {
  try {
    const diff = await updateLastModified();
    const jobs = [];
    const keys = _.keys(diff);
    if(keys.length) {
      jobs.push(loadIndexTerms());
    }
    if(_.includes(keys, 'recordsets')) {
      jobs.push(loadRecordsets());
    }
    await bluebird.all(jobs);
    app.lastModified = getLastModified();
    setTimeout(updateLastModifiedLoop, repeatEvery);
  } catch (err) {
    logger.error(err);
  }
};

if(config.ENV === 'test') {
  app.ready = bluebird.all([loadRecordsets(), loadIndexTerms()]);
} else {
  app.ready = updateLastModifiedLoop().then(() => logger.info("App warmup finished"));
}
