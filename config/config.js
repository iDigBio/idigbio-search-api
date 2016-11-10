"use strict";

/* eslint no-process-env: 0 */

var redis = require("redis");

var config = {
  ENV: process.env.NODE_ENV || "test",
  GEN_MOCK: process.env.GEN_MOCK === "true",
  CLUSTER: process.env.CLUSTER !== "false",
  CLUSTER_WORKERS: Number(process.env.CLUSTER_WORKERS) || 10,
  CI: process.env.CI === "true",

  port: 19196,
  search: {
    server: "http://c18node2-crn.acis.ufl.edu:9200",
    index: "idigbio-2.10.3",
    statsIndex: "stats-2.5.0",
  },
  elasticsearch: {
    hosts: [
      "c18node2.acis.ufl.edu:9200",
      "c18node6.acis.ufl.edu:9200",
      "c18node10.acis.ufl.edu:9200",
      "c18node12.acis.ufl.edu:9200",
      "c18node14.acis.ufl.edu:9200"
    ],
    apiVersion: "2.3",
    sniffOnStart: false,
    sniffOnConnectionFault: true
  },
  maxRecordsets: 10000,
  defaultLimit: 100,
  maxLimit: 5000,
  recordsets: {},
  indexterms: {},
  redis: {
    hostname: "localhost",
    port: 6379
  },
  maxTileObjects: 10000,
  cacheTimeout: 60 * 60
};

if(config.ENV === "prod") {
  config.redis.hostname = "idb-redis-search-prod.acis.ufl.edu";
} else if(config.ENV === "beta") {
  config.redis.hostname = "idb-redis-search-beta.acis.ufl.edu";

  // config.elasticsearch.hosts = [
  //    "c17node52.acis.ufl.edu:9200",
  //    "c17node53.acis.ufl.edu:9200",
  //    "c17node54.acis.ufl.edu:9200",
  //    "c17node55.acis.ufl.edu:9200",
  //    "c17node56.acis.ufl.edu:9200"
  // ];
  // config.search.index = "idigbio-2.10.3";
}

config.redis.client = redis.createClient(config.redis.port, config.redis.hostname);

module.exports = config;
