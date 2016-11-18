"use strict";

/* eslint no-process-env: 0 */

var env = process.env.NODE_ENV || "development";

var config = {
  ENV: env,
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
      "http://c18node2.acis.ufl.edu:9200",
      "http://c18node6.acis.ufl.edu:9200",
      "http://c18node10.acis.ufl.edu:9200",
      "http://c18node12.acis.ufl.edu:9200",
      "http://c18node14.acis.ufl.edu:9200"
    ],
    apiVersion: "2.4",
    sniffOnStart: false,
    sniffOnConnectionFault: true,
  },
  maxRecordsets: 10000,
  defaultLimit: 100,
  maxLimit: 5000,
  recordsets: {},
  indexterms: {},
  redis: {
    hostname: {
      prod: "idb-redis-search-prod.acis.ufl.edu",
      beta: "idb-redis-search-beta.acis.ufl.edu",
    }[env] || "localhost",
    port: 6379
  },
  maxTileObjects: 10000,
  cacheTimeout: 60 * 60
};

module.exports = config;
