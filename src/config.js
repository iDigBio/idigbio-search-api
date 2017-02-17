/* eslint no-process-env: 0, strict: 0 */
// NB: This module needs to be requireable without babel
//     translation. No advanced features. No imports.

"use strict";

var env = process.env.NODE_ENV || "development";

var config = {
  ENV: env,
  GEN_MOCK: process.env.GEN_MOCK === "true",
  CLUSTER: process.env.CLUSTER !== "false",
  CLUSTER_WORKERS: Number(process.env.CLUSTER_WORKERS) || require('os').cpus().length,
  CI: process.env.CI === "true",

  port: 19196,
  search: {
    server: "http://c18node2-crn.acis.ufl.edu:9200",
    index: process.env.SEARCH_INDEX || "idigbio",
    statsIndex: process.env.STATS_INDEX || "stats",
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
    host: {
      prod: "idb-redis-search-prod.acis.ufl.edu",
      beta: "idb-redis-search-beta.acis.ufl.edu",
    }[env] || "localhost",
    port: 6379
  },
  maxTileObjects: 10000,
  defaultStyle: {
    scale: 'YlOrRd',
    pointScale: 'Dark2',
    // pointScale: ["#FFF", "#000", "#FAB"],
    styleOn: 'scientificname',
    styleBuckets: 5
  },

  cacheTimeout: 14 * 24 * 60 * 60
};


module.exports = config;
