import Promise from "bluebird";
import predis from "promise-redis";

import config from 'config';

const redis = predis(function(resolver) {
  return new Promise(resolver);
});

export default redis.createClient(config.redis.port, config.redis.hostname);
