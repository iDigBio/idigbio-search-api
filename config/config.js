var redis = require("redis")

var config = {
    port: 19196,
    search: {
        server: "http://c17node52.acis.ufl.edu:9200",
        index: "idigbio-2.3.0",
        statsIndex: "stats-2.2.0",
        useEsClient: true
    },
    elasticsearch: {
        hosts: [
            "c17node52.acis.ufl.edu:9200",
            "c17node53.acis.ufl.edu:9200",
            "c17node54.acis.ufl.edu:9200",
            "c17node55.acis.ufl.edu:9200",
            "c17node56.acis.ufl.edu:9200"
        ],
        apiVersion: "1.4",
        sniffOnStart: true,
        sniffOnConnectionFault: true
    },
    maxRecordsets: 1000,
    defaultLimit: 100,
    maxLimit: 5000,
    recordsets: {},
    redis: {
        hostname: "localhost",
        port: 6379
    },
    maxTileObjects: 10000,
    cacheTimeout: 60*60,
}

if (process.env.NODE_ENV === "prod") {
    config.redis.hostname = "idb-redis-search-prod";
    config.search.useEsClient = true;
} else if (process.env.NODE_ENV === "beta") {
    config.redis.hostname = "idb-redis-search-beta";
    config.search.useEsClient = true;
}

config.redis.client = redis.createClient(config.redis.port,config.redis.hostname)

module.exports = config;
