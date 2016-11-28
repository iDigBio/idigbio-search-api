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

  app.route('/v2/summary/top/media')
    .get(summary.top_media)
    .post(summary.top_media);
  app.route('/v2/summary/top/basic')
    .get(summary.top_basic)
    .post(summary.top_basic);
  app.route('/v2/summary/top/records')
    .get(summary.top_basic)
    .post(summary.top_basic);
  app.route('/v2/summary/top/recordsets')
    .get(summary.top_recordsets)
    .post(summary.top_recordsets);
  app.route('/v2/summary/count/media')
    .get(summary.count_media)
    .post(summary.count_media);
  app.route('/v2/summary/count/basic')
    .get(summary.count_basic)
    .post(summary.count_basic);
  app.route('/v2/summary/count/records')
    .get(summary.count_basic)
    .post(summary.count_basic);
  app.route('/v2/summary/count/recordset')
    .get(summary.count_recordset)
    .post(summary.count_recordset);
  app.route('/v2/summary/count/recordsets')
    .get(summary.count_recordset)
    .post(summary.count_recordset);
  app.route('/v2/summary/modified/media')
    .get(summary.modified_media)
    .post(summary.modified_media);
  app.route('/v2/summary/modified/records')
    .get(summary.modified_basic)
    .post(summary.modified_basic);
  app.route('/v2/summary/datehist')
    .get(summary.date_hist)
    .post(summary.date_hist);
  app.route('/v2/summary/stats/:t')
    .get(summary.stats)
    .post(summary.stats);


  app.use(function(err, req, res, next) {
    if(err) {
      next(err);
    } else {
      res.status(404).json({"error": "Not Found"});
      next();
    }
  });
};
