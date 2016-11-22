
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
      // Need to reset status after setting body.
      ctx.status = 404;
    }
  };
}
