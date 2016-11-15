var config = require("./config/config.js");
var async = require("async");

config.redis.client.keys("map_cache_*", function(err, results) {
    console.log(results);
    async.each(results, function(key, cb) {
        config.redis.client.del(key, function(err, results) {
            console.log(key);
            cb();
        });
    }, function() {
      process.exit();  // eslint-disable-line no-process-exit
    });
});
