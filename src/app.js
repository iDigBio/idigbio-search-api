import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import morgan from 'koa-morgan';
import compress from 'koa-compress';

import api from 'api';
import "controllers/home";
import "controllers/view";
// import config from './config';

const compresser = compress({
  filter: function(content_type) {
    return (/text/i).test(content_type);
  },
  threshold: 2048,
  flush: require('zlib').Z_SYNC_FLUSH
});

const logger = morgan('combined');

// TODO: Trust X-Forwarded-For proxy config
const app = new Koa()
      .use(logger)
      .use(compresser)
      .use(cors())
      .use(bodyParser())
      .use(api.routes())
      .use(api.allowedMethods())
;

export default app;
