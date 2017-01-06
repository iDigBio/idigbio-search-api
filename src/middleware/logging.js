import bluebird from "bluebird";
import morgan from "morgan";

import config from "config";

const formatFromEnv = {
  'prod': 'combined',
  'beta': 'combined'
}[config.ENV] || 'dev';

morgan.token('remote-addr', (req) => req.context.ip);


export default function logging(format, options) {
  format = format || formatFromEnv;
  const morganFn = bluebird.promisify(morgan(format, options));
  return function(ctx, next) {
    ctx.req.context = ctx;
    return morganFn(ctx.req, ctx.res).then(next);
  };
}
