
import getLastModified from "lib/lastModified";


export default function lastModifiedMiddleware(opts = {}) {
  const type = opts && opts.type;
  const maxAge = opts && opts.maxAge;
  return async function(ctx, next) {
    const lm = getLastModified(type);
    if(lm) {
      ctx.status = 200;
      ctx.lastModified = lm;
      ctx.cacheControl(maxAge);
      if(ctx.fresh) {
        ctx.status = 304;
        return null;
      }
    }
    return next();
  };
}
