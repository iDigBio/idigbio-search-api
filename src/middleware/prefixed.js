import _ from "lodash";


/**
 *  Wraps another middleware and only applies it if the request
 *  matches a given prefix.
 */
export default function prefixed(opts, middleware) {
  let prefix = opts.prefix;
  if(!_.isRegExp(prefix)) {
    prefix = new RegExp('^' + _.escapeRegExp(prefix));
  }
  return function(ctx, next) {
    if(prefix.test(ctx.path)) {
      return middleware(ctx, next);
    }
    return next();
  };
}
