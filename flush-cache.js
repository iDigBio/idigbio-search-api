"use strict";

var config = require("./config/config.js");

var cache = require("./app/lib/cache")(null, config);

cache.flush()
  .then(function() {
    process.exit(0);  // eslint-disable-line no-process-exit
  })
  .catch(function(err) {
    console.error("Failed clearing cache:", err);
    process.exit(1);  // eslint-disable-line no-process-exit
  });
