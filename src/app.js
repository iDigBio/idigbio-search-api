import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import morgan from 'koa-morgan';
import compress from 'koa-compress';

import api from 'api';
import "controllers/home";
import "controllers/view";
import "controllers/manage";
// import config from './config';

const compresser = compress({
  filter: function(content_type) {
    return (/text/i).test(content_type);
  },
  threshold: 2048,
  flush: require('zlib').Z_SYNC_FLUSH
});

const logger = morgan('combined');

const jsonErrors = async function(ctx, next) {
  try {
    await next();
  } catch (err) {
    // will only respond with JSON
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      error: err.message
    };
    throw err;
  }
  if(ctx.status === 404) {
    ctx.body = {error: "Not Found"};
    ctx.status = 404;
  }
};

// TODO: Trust X-Forwarded-For proxy config
const app = new Koa()
      .use(logger)
      .use(compresser)
      .use(jsonErrors)
      .use(cors())
      .use(bodyParser())
      .use(api.routes())
      .use(api.allowedMethods())
;

export default app;
