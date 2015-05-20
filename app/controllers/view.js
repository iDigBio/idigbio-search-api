"use strict";

var _ = require("lodash");

module.exports = function(app, config) {
    var loadRecordsets = require("../lib/load-recordsets.js")(app,config);
    var searchShim = require("../lib/search-shim.js")(app,config);

    return {
        // version:
        // http://idb-riak.acis.ufl.edu:8098/buckets/record_catalog/keys/0000012b-9bb8-42f4-ad3b-c958cb22ae45
        // http://idb-riak.acis.ufl.edu:8098/buckets/record/keys/0000012b-9bb8-42f4-ad3b-c958cb22ae45-14cdaa01e6581b4af8b5d544c9eaa2750b2eb4cf
        basic: function(req, res, next) {

            var t = req.params.t || "_all";
            var uuid = req.params.uuid;

            if (t == "media") {
                t = "mediarecords";
            }

            var query = {
                "query": {
                    "term": {
                        "uuid": uuid
                    }
                }
            }

            searchShim(config.search.index,t,"_search",query,function(err,body){
                if(err) {
                    next(err)
                } else {
                    if (body.hits.hits.length > 0) {
                        body = body.hits.hits[0];
                        var indexterms = _.cloneDeep(body._source);
                        delete indexterms["data"];
                        var rb = {
                            "uuid": body._id,
                            "type": body._type,
                            "etag": body._source.etag,
                            "version": body._source.version,
                            "data": body._source.data,
                            "recordIds": body._source.recordIds,
                            "indexTerms": indexterms,
                            "attribution": {}
                        };

                        if (body._source.recordset){
                            var rs = {
                                "uuid": body._source.recordset
                            };
                            if (config.recordsets[body._source.recordset]) {
                                _.defaults(rs,config.recordsets[body._source.recordset]);
                                rb.attribution = rs;
                                res.json(rb);
                                next();
                            } else {
                                loadRecordsets(function(){
                                    _.defaults(rs,config.recordsets[body._source.recordset]);
                                    rb.attribution = rs;
                                    res.json(rb);
                                    next();
                                });
                            }
                        } else {
                            res.json(rb);
                            next();
                        }
                    } else {
                        res.status(404).json({
                            "error": "Not Found",
                            "statusCode": 404
                        });
                        next();
                    }
                }
            }, {
                    type: "view",
                    recordtype: t,
                    ip: req.ip,
            });
        },
    };
};