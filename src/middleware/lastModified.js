

export default function lastModifiedMiddleware(opts = {}) {
  const maxAge = opts && opts.maxAge;
  return function(ctx, next) {
    if(ctx.app.lastModified) {
      ctx.status = 200;
      ctx.lastModified = ctx.app.lastModified;
      ctx.cacheControl(maxAge);
      if(ctx.fresh) {
        ctx.status = 304;
        return null;
      }
    }
    return next();
  };
}
