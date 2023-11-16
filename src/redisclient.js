import bluebird from "bluebird";
import _ from "lodash";

import config from "config";
import logger from "logging";
import redis from "redis";
import redisPool from "sol-redis-pool";
import {list as redisCmds} from "redis-commands";

const rconf = _.pick(config.redis, ['host', 'port', 'db', 'password']),
      poolSettings = {
        max: 10,
        min: 2
      };

logger.info("Using redis server: %s", rconf.host);

const pool = redisPool(rconf, poolSettings);


const clproto = redis.RedisClient.prototype;

/**
 * A factory for redis methods that will:
 *   1. get a connection from the pool
 *   2. run the given command (e.g. hget) async returning a promise
 *   3. ensures the connection is released to the pool
 */
function promisifyFromPool(fn) {
  return function(...args) {
    return bluebird
      .fromCallback((cb) => pool.acquire(cb))
      .then(function(conn) {
        return bluebird
          .fromCallback(fn.bind(conn, ...args))
          .finally(() => pool.release(conn));
      });
  };
}

const client = {pool};
_(redisCmds)
  .map((fullCommand) => fullCommand.split(' ')[0])
  .filter((cmdname) => cmdname !== 'multi' && clproto[cmdname])
  .forEach(function(cmdname) {
    client[cmdname] = promisifyFromPool(clproto[cmdname]);
  });


// this might not be defined on redis-mock.
if(redis.Multi) {
  const mlproto = redis.Multi.prototype;
  client.exec_transaction = promisifyFromPool(mlproto.exec_transaction);
}

export default client;


/*   client[cmdName] = function(...args) {
     return new Promise(function(resolve, reject) {
     pool.acquire(function(conn) {
     const cb = (err, result) => {
     pool.release(conn);
     return err ? reject(err) : resolve(result);
     };
     fn.call(conn, ...args, cb);
     });
     });
     };
*/
