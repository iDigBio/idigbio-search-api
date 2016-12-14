"use strict";

module.exports = function(app, config) {

  // home route
  var summary = require('../app/controllers/summary')(app, config);
  var cache = require('../app/lib/cache.js')(app, config);

  // app.use(function(req, res, next){
  //     console.log(req.originalUrl);
  //     console.log(req.body);
  //     console.log(req.params);
  //     next();
  // })



  app.use(function(err, req, res, next) {
    if(err) {
      next(err);
    } else {
      res.status(404).json({"error": "Not Found"});
      next();
    }
  });
};
