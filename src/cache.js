import _ from "lodash";
import cacheManager from "cache-manager";
import redisStore from "cache-manager-redis";

import config from "config";
import {getLastModified} from "lib/lastModified";
import hash from "lib/hasher";
import timer from "lib/timer";

const memoryCache = cacheManager.caching({
  store: 'memory',
  max: 128,
  ttl: 600
});

let cache = null;

if(config.ENV === 'test') {
  cache = memoryCache;
} else {
  const redisCache = cacheManager.caching(_.defaults({
    store: redisStore,
    ttl: 3600,
    compress: true
  }, config.redis));
  cache = cacheManager.multiCaching([memoryCache, redisCache]);
}

const version = process.env.npm_package_version; /* eslint no-process-env: 0 */

/**
 * call this with a base key and it will improve it with the current
 * software version and lastmodified date for better cache busting.
 */
function improveKey(k) {
  if(!_.isArray(k)) {
    k = [k];
  }
  k.push(version);
  const lm = getLastModified();
  if(lm) { k.push(lm.getTime()); }

  // convert to array of strings, and then join it; this way the key
  // is still moderately readable in redis
  return _(k)
    .map((kp) => (_.isString(kp) ? kp : hash('md5', kp)))
    .join(":");
}

export default {
  cache,
  improveKey,

  wrap(k, fn, ...args) {
    k = this.improveKey(k);
    return this.cache.wrap(k, timer(k, fn), ...args);
  },

  memoize(k, fn) {
    const wrap = this.wrap.bind(this);
    return function(...args) {
      return wrap([k, ...args], () => fn(...args));
    };
  }
};
