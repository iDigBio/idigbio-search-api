import bluebird from "bluebird";
import config from 'config';

let redis = null;

if(config.ENV === 'test') {
  redis = require('redis-mock');
} else {
  redis = require('redis');
}


// Most of this code comes from `promise-redis`, but:
//  * Use bluebird and their promisify directly
//  * guard against redis.Multi not being defined

import {list as redisCmds} from "redis-commands";
const clproto = redis.RedisClient.prototype;

redisCmds.forEach(function(fullCommand) {
  var cmd = fullCommand.split(' ')[0];
  if(cmd !== 'multi' && clproto[cmd]) {
    clproto[cmd] = bluebird.promisify(clproto[cmd]);
    clproto[cmd.toUpperCase()] = clproto[cmd];
  }
});


if(redis.Multi) {
  const mlproto = redis.Multi.prototype;
  // For Multi only `exec` command returns promise.
  mlproto.exec_transaction = bluebird.promisify(mlproto.exec_transaction);
  mlproto.exec = mlproto.exec_transaction;
  mlproto.EXEC = mlproto.exec;
}

export default () => redis.createClient(config.redis.port, config.redis.hostname);
