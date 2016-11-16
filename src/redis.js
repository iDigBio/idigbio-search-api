import config from '../config';
import redis from "redis";

export default redis.createClient(config.redis.port, config.redis.hostname);
