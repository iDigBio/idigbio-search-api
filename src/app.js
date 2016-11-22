import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import morgan from 'koa-morgan';
import compress from 'koa-compress';


import jsonErrors from 'middleware/jsonErrors';

import api from 'api';
import "controllers/home";
import "controllers/view";
import "controllers/manage";


const compressionOpts = {
  filter: function(content_type) {
    return (/text/i).test(content_type);
  },
  threshold: 2048,
  flush: require('zlib').Z_SYNC_FLUSH
};


// TODO: Trust X-Forwarded-For proxy config
const app = new Koa()
      .use(morgan('combined'))
      .use(compress(compressionOpts))
      .use(jsonErrors())
      .use(cors())
      .use(bodyParser())
      .use(api.routes())
      .use(api.allowedMethods())
;

export default app;
