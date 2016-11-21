import redis from "redis";

import config from 'config';

export default redis.createClient(config.redis.port, config.redis.hostname);
