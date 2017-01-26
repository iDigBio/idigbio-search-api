import _ from "lodash";
import bluebird from "bluebird";
import morgan from "morgan";
import logger from "logging";

morgan.token('remote-addr', (req) => req.context.ip);

const lstream = {
  write: function(message, encoding) {
    logger.info(message);
  }
};

export default function logging(format, options) {
  format = format || ':remote-addr - ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms';

  const morganFn = bluebird.promisify(morgan(format, _.defaults(options, {'stream': lstream})));
  return function(ctx, next) {
    ctx.req.context = ctx;
    return morganFn(ctx.req, ctx.res).then(next);
  };
}
