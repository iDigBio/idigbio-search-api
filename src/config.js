/* eslint no-process-env: 0, strict: 0 */
// NB: This module needs to be requireable without babel
//     translation. No advanced features. No imports.

"use strict";

// Use a system environment variable named NODE_ENV, default to "development" if unset.
var env = process.env.NODE_ENV || "development";

var indexAlias = "idigbio";
if(env === "beta") {
  indexAlias = "beta";
}

// default to debug logging when in development or test environment
var logger_level
if((env === "development") || (env === "test")) {
  logger_level = "debug";
}

var config = {
  ENV: env,
  LOGGER_LEVEL: process.env.LOGGER_LEVEL || logger_level,

  /* Although '2' (HTTP/2) is used in production,
   * '1' (HTTP/1.1) is useful for local development,
   * since all major web browsers mandate HTTP/2 only over TLS
   * and all other web clients may require prior knowledge that this server
   * uses HTTP/2 (e.g. `curl --http2-prior-knowledge`). */
  HTTP_VERSION: process.env.HTTP_VERSION || '2', //accepted values: '1' '2'

  GEN_MOCK: process.env.GEN_MOCK === "true",
  CLUSTER: process.env.CLUSTER !== "false",
  CLUSTER_WORKERS: Number(process.env.CLUSTER_WORKERS) || require('os').cpus().length,
  CI: process.env.CI === "true",

  port: 19196,
  search: {
    server: process.env.NODE_ENV ==='beta' ? "http://c20node1.acis.ufl.edu:9200" : "http://esnodec1.acis.ufl.edu:9200",
    index: process.env.SEARCH_INDEX || indexAlias,
    statsIndex: process.env.STATS_INDEX || "stats",
  },
  elasticsearch: {
    hosts: process.env.NODE_ENV ==='prod' ? [
      "http://esnodec1.acis.ufl.edu:9200",
      "http://esnodec2.acis.ufl.edu:9200",
      "http://esnodec3.acis.ufl.edu:9200"
    ] : [
      "http://localhost:9200"
      /* "http://10.13.44.161:9200",
      "http://10.13.44.162:9200",
      "http://10.13.44.163:9200",
      "http://10.13.44.164:9200",
      "http://10.13.44.165:9200",
      "http://10.13.44.166:9200",
      "http://10.13.44.167:9200",
      "http://10.13.44.168:9200",
      "http://10.13.44.169:9200",
      "http://10.13.44.170:9200",
      "http://10.13.44.171:9200",
      "http://10.13.44.172:9200", */
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
      prod: "idb-redis10-prod.acis.ufl.edu",
      beta: "idb-redis11-beta.acis.ufl.edu",
    }[env] || "localhost",
    db: 0,
    port: 6379,
    password: process.env.IDB_REDIS_AUTH
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
