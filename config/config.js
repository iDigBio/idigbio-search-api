var redis = require("redis")

var config = {
    "port": 19196,
    "search": {
        "server": "http://c17node52:9200/",
        "index": "idigbio-2.0.0/",
    },
    maxRecordsets: 1000,
    defaultLimit: 100,
    maxLimit: 5000,
    recordsets: {},
    "redis": {
        "hostname": "localhost",
        "port": 6379
    },
    maxTileObjects: 100000,
}

if (process.env.NODE_ENV === "prod") {
    config.redis.hostname = "idb-redis-search-prod";
} else if (process.env.NODE_ENV === "beta") {
    config.redis.hostname = "idb-redis-search-beta";
}

config.redis.client = redis.createClient(config.redis.port,config.redis.hostname)

module.exports = config;