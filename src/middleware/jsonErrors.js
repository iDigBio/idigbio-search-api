import _ from "lodash";
import config from "config";

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
      // No cache errors
      ctx.remove('Last-Modified');
      // will only respond with JSON
      if(err.expose || config.ENV !== "prod") {
        ctx.body = _.assign({ error: err.message, statusCode: err.statusCode || err.status }, err);
        delete ctx.body.expose;
        delete ctx.body.message;
      } else {
        ctx.body = { error: "Internal Server Error" };
        ctx.app.emit('error', err, ctx);
      }
      ctx.status = err.statusCode || err.status || 500;
    }
  };
}
