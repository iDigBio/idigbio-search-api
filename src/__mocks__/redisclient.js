import bluebird from "bluebird";
import redis from "redis-mock";

import logger from "logging";

logger.info("Using fake redis-mock connection");
const rc = redis.createClient();

// Most of this code comes from `promise-redis`, but:
//  * Use bluebird and their promisify directly
//  * guard against redis.Multi not being defined

import {list as redisCmds} from "redis-commands";
const clproto = redis.RedisClient.prototype;

const opts = {context: rc};
const client  = {};

redisCmds.forEach(function(fullCommand) {
  var cmd = fullCommand.split(' ')[0];
  if(cmd !== 'multi' && clproto[cmd]) {
    client[cmd] = bluebird.promisify(clproto[cmd], opts);
  }
});


if(redis.Multi) {
  const mlproto = redis.Multi.prototype;
  // For Multi only `exec` command returns promise.
  client.exec_transaction = bluebird.promisify(mlproto.exec_transaction, opts);
}

export default client;
