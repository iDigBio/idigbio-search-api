"use strict";

var _ = require("lodash");
var async = require("async");

module.exports = function(app,config) {    
    var loadRecordsets = require("../lib/load-recordsets.js")(app,config);

    function attribution(rss,cb) {
        async.mapSeries(rss,function(bucket,acb){
            var rs = {
                "uuid": bucket.key,
                "itemCount": bucket.doc_count
            };
            if (config.recordsets[bucket.key]) {
                _.defaults(rs,config.recordsets[bucket.key]);
                acb(null,rs);
            } else {
                loadRecordsets(function(){
                    _.defaults(rs,config.recordsets[bucket.key]);
                    acb(null,rs);
                });
            }
        },function(err,results){
            cb(results);
        });        
    }
    
    function basic(body, res) {
        body = JSON.parse(body);

        if (body.status === 400) {
            res.status(400).json({
                "error": "Bad Request"
            });
            return;
        }

        var rb = {
            "itemCount": body.hits.total,
            "items": [],
            "attribution": []
        };

        body.hits.hits.forEach(function(hit){
            var indexterms = _.cloneDeep(hit._source);
            delete indexterms["data"];
            if(!hit._source.data["idigbio:data"]) {
                hit._source.data["idigbio:data"] = {};
            }
            rb.items.push({
                "uuid": hit._id,
                "etag": hit._source.data["idigbio:etag"],
                "version": hit._source.data["idigbio:version"],
                "data": hit._source.data["idigbio:data"],
                "recordIds": hit._source.data["idigbio:recordIds"],
                "indexTerms": indexterms,
            });
        });

        attribution(body.aggregations.rs.buckets, function(results){
            rb.attribution = results;
            res.json(rb);            
        });   
    }

    function top_aggs(b) {
        var bv = {};

        if (b.doc_count) {
            bv["itemCount"] = b.doc_count
        }

        Object.keys(b).forEach(function(k){
            if (k.slice(0,4) == "top_") {
                var ok = k.slice(4);
                bv[ok] = {};
                b[k].buckets.forEach(function(bk){
                    bv[ok][bk.key] = top_aggs(bk);
                });
            }
        });
        return bv;
    }

    function top_formatter(body, res) {
        body = JSON.parse(body);

        if (body.status === 400) {
            res.status(400).json({
                "error": "Bad Request"
            });
            return;
        }

        var rb = top_aggs(body.aggregations);
        rb["itemCount"] = body.hits.total;

        res.json(rb);
    }

    function date_hist_formatter(body,res) {
        body = JSON.parse(body);

        if (body.status === 400) {
            res.status(400).json({
                "error": "Bad Request"
            });
            return;
        }

        var rb = { "dates": {} }
        body.aggregations.fdh.dh.buckets.forEach(function(b){
            rb.dates[b.key_as_string] = top_aggs(b);
        })

        rb["itemCount"] = body.hits.total;
        rb["rangeCount"] = body.aggregations.fdh.doc_count;

        res.json(rb);
    }

    return {
        basic: basic,
        attribution: attribution,
        top_formatter: top_formatter,
        date_hist_formatter: date_hist_formatter
    };
};