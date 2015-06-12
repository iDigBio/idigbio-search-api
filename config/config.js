var redis = require("redis")

var config = {
    port: 19196,
    search: {
        server: "http://c17node52.acis.ufl.edu:9200",
        index: "idigbio-2.4.0",
        statsIndex: "stats-2.4.0",
        useEsClient: true
    },
    elasticsearch: {
        hosts: [
            "c18node2.acis.ufl.edu:9200",
            "c18node6.acis.ufl.edu:9200",
            "c18node10.acis.ufl.edu:9200",
            "c18node12.acis.ufl.edu:9200",
            "c18node14.acis.ufl.edu:9200"
        ],
        apiVersion: "1.5",
        sniffOnStart: false,
        sniffOnConnectionFault: true
    },
    maxRecordsets: 1000,
    defaultLimit: 100,
    maxLimit: 5000,
    recordsets: {},
    indexterms: {},
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
