/**
 * An implementation of a caching middleware; this is untested
 */

import bluebird from "bluebird";

import redisclient from "redisclient";
import config from "config";

export default async function cache(ctx, next) {
  // console.log("CHECK CACHE " + req.originalUrl)
  try {
    const result = await redisclient.hgetall("map_cache_" + ctx.originalUrl);
    if(result) {
      ctx.type = result.type;
      ctx.status = result.status;
      ctx.body = new Buffer(result.body, "base64");
      return;
    }
  } catch (e) {
    console.error("Problem reading from cache", e);
  }
  try {
    await next();
  } catch (e) {
    return;
  }

  var to_cache = {};

  // De-marshall
  to_cache.status = ctx.statusCode;
  to_cache.body = new Buffer(ctx.body).toString("base64");
  to_cache.type = ctx.type;
  redisclient.hmset("map_cache_" + ctx.originalUrl, to_cache);
  redisclient.expire("map_cache_" + ctx.originalUrl, config.cacheTimeout);

  // console.log("CACHE " + req.originalUrl)
  // console.log(to_cache.status,to_cache.type);

}

export async function flush() {
  const rclient = redisclient();
  const cachekeys = await rclient.keys("map_cache_*");
  console.log("Found", cachekeys.length, "keys to clear");
  return bluebird
    .each(cachekeys, async function(key) {
      await rclient.del(key);
      console.log("Deleted", key);
    });
}
