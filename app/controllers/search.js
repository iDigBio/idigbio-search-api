"use strict";

var _ = require('lodash');

module.exports = function(app, config) {
    var formatter = require("../lib/formatter.js")(app,config);
    var cp = require("../lib/common-params.js")(app,config);
    var qg = require("../lib/query-generators.js")(app,config);
    var searchShim = require("../lib/search-shim.js")(app,config);

    var required_fields = ["data.idigbio:version", "data.idigbio:etag", "data.idigbio:recordIds"];

    return {
        media: function(req, res, next) {
            try {
                var mq = cp.query("mq", req);

                var rq = cp.query("rq", req);

                var limit = cp.limit(req);

                var offset = cp.offset(req);

                var sort = cp.sort(req);

                var fields = cp.fields(req);
                if (_.isArray(fields)) {
                    fields.push.apply(fields,required_fields);
                }

                var fields_exclude = cp.fields_exclude(req);

                var query = qg.media_query(rq,mq,fields,sort,limit,offset,fields_exclude)

                searchShim(config.search.index,"mediarecords","_search",query,function(err,body){
                    if(err) {
                        next(err)
                    } else {
                        formatter.basic(body, res, next);
                    }
                });
            } catch (e) {
                res.status(400).json(e);
                next();
                return;
            }
        },

        basic: function(req, res, next) {
            try {
                var rq = cp.query("rq", req);

                var limit = cp.limit(req);

                var offset = cp.offset(req);

                var sort = cp.sort(req);

                var fields = cp.fields(req);
                if (_.isArray(fields)) {
                    fields.push.apply(fields,required_fields);
                }

                var fields_exclude = cp.fields_exclude(req);

                var query = qg.record_query(rq,fields,sort,limit,offset,fields_exclude);
                searchShim(config.search.index,"records","_search",query,function(err,body){
                    if(err) {
                        next(err)
                    } else {
                        formatter.basic(body, res, next);
                    }
                });
            } catch (e) {
                res.status(400).json(e);
                next();
                return;
            }                
        },

        recordsets: function(req, res, next) {
            try {
                var rsq = cp.query("rsq", req);

                var limit = cp.limit(req);

                var offset = cp.offset(req);

                var sort = cp.sort(req);

                var fields = cp.fields(req);
                if (_.isArray(fields)) {
                    fields.push.apply(fields,required_fields);
                }

                var fields_exclude = cp.fields_exclude(req);

                var query = qg.bare_query(rsq,fields,sort,limit,offset,fields_exclude);

                searchShim(config.search.index,"recordsets","_search",query,function(err,body){
                    if(err) {
                        next(err)
                    } else {
                        formatter.basicNoAttr(body, res, next);
                    }
                })
            } catch (e) {
                res.status(400).json(e);
                next();
                return;
            }
        },

        publishers: function(req, res, next) {
            try {
                var pq = cp.query("pq", req);

                var limit = cp.limit(req);

                var offset = cp.offset(req);

                var sort = cp.sort(req);

                var fields = cp.fields(req);
                if (_.isArray(fields)) {
                    fields.push.apply(fields,required_fields);
                }

                var fields_exclude = cp.fields_exclude(req);

                var query = qg.bare_query(pq,fields,sort,limit,offset,fields_exclude);

                searchShim(config.search.index,"publishers","_search",query,function(err,body){
                    if(err) {
                        next(err)
                    } else {
                        formatter.basicNoAttr(body, res, next);
                    }
                })
            } catch (e) {
                res.status(400).json(e);
                next();
                return;
            }
        },
    };
};