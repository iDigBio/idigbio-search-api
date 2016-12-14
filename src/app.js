import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import morgan from 'koa-morgan';
import compress from 'koa-compress';


import jsonErrors from 'middleware/jsonErrors';

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

const logOpts = config.ENV === 'production' ? 'combined' : 'dev';


// TODO: Trust X-Forwarded-For proxy config
const app = new Koa()
      .use(morgan(logOpts))
      .use(compress(compressionOpts))
      .use(jsonErrors())
      .use(cors())
      .use(bodyParser())
      .use(api.routes())
      .use(api.allowedMethods())
;

export default app;
