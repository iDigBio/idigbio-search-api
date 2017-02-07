import _ from "lodash";
import cacheManager from "cache-manager";
import redisStore from "cache-manager-redis";

import config from "config";
import {getLastModified} from "lib/lastModified";

const memoryCache = cacheManager.caching({
  store: 'memory',
  max: 128,
  ttl: 600
});

const redisCache = cacheManager.caching(_.defaults({
  store: redisStore,
  db: 1,
  ttl: 3600,
  compress: true
}, config.redis));

const cache = cacheManager.multiCaching([memoryCache, redisCache]);

const version = process.env.npm_package_version; /* eslint no-process-env: 0 */
cache.improveKey = function(k) {
  k += ":" + version;
  const lm = getLastModified();
  if(lm) { k += ":" + lm.getTime(); }
  return k;
};

export default cache;
