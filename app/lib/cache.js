"use strict";

var _ = require("lodash");

module.exports = function(app, config) {
  return function(req, res, next) {
    if(config.ENV === "test") {
      next();
      return;
    }

    // console.log("CHECK CACHE " + req.originalUrl)
    config.redis.client.hgetall("map_cache_" + req.originalUrl, function(err, result) {
      if(result) {
        res.type(result.type);
        res.status(result.status).send(new Buffer(result.body, "base64"));
        // Do not call next, we don't want to run anything else
        // console.log("SERVE FROM CACHE " + req.originalUrl)
      } else {
        res.realSend = res.send;

        res.send = function(body) {
          var to_cache = {};

          // De-marshall
          to_cache.status = res.statusCode;
          to_cache.body = new Buffer(body).toString("base64");
          to_cache.type = res.get("Content-Type");

          config.redis.client.hmset("map_cache_" + req.originalUrl, to_cache);
          config.redis.client.expire("map_cache_" + req.originalUrl, config.cacheTimeout);

          // console.log("CACHE " + req.originalUrl)
          // console.log(to_cache.status,to_cache.type);

          res.realSend(body);
        };
        next();
      }
    });
  };
};
