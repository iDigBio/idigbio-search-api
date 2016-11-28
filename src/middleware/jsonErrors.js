
/**
 * This is a middleware that will ensure that all errors and 404s end
 * up encoded as json rather than plain text.
 *
 * @param opts - currently ignored, no options
 * @returns the function to .use on the app.
 */
export default function(opts) {
  return async function jsonErrors(ctx, next) {
    try {
      await next();
      if(!ctx.status || (ctx.status === 404 && !ctx.body)) {
        ctx.throw(404);
      }
    } catch (err) {
      // will only respond with JSON
      ctx.body = {
        error: err.message
      };
      ctx.status = err.statusCode || err.status || 500;
      if(!err.expose && ctx.status >= 500) {
        ctx.app.emit('error', err, ctx);
      }
    }
  };
}
