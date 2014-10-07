var request = require('request');
var _ = require("lodash");
var async = require("async");
var geohash = require("ngeohash");

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var loadRecordsets = require("../lib/load-recordsets.js")(app,config);
    var tileMath = require("../lib/tile-math.js")(app,config);
    var getParam = require("../lib/get-param.js")(app,config);

    function geoJsonPoints(body,cb){
        var rb = {
            "itemCount": body.hits.total,
            "type": "FeatureCollection",
            "features": [],
            "attribution": []
        }

        body.hits.hits.forEach(function(hit){
            var indexterms = _.cloneDeep(hit._source);
            delete indexterms["data"]
            rb.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [hit._source.geopoint.lon, hit._source.geopoint.lat]
                },
                "properties": {
                    "uuid": hit._id,
                    "etag": hit._source.data["idigbio:etag"],
                    "version": hit._source.data["idigbio:version"],
                    "data": hit._source.data["idigbio:data"],
                    "recordIds": hit._source.data["idigbio:recordIds"],
                    "indexTerms": indexterms,
                }
            })
        });

        async.mapSeries(body.aggregations.rs.buckets,function(bucket,acb){
            var rs = {
                "uuid": bucket.key,
                "itemCount": bucket.doc_count
            };
            if (config.recordsets[bucket.key]) {
                _.defaults(rs,config.recordsets[bucket.key])
                acb(null,rs)
            } else {
                loadRecordsets(function(){
                    _.defaults(rs,config.recordsets[bucket.key])
                    acb(null,rs)
                });
            }
        },function(err,results){
            rb.attribution = results;
            cb(rb);
        });    
    }

    function geoJsonGeohash(body,cb){
        var rb = {
            "itemCount": body.hits.total,
            "type": "FeatureCollection",
            "features": [],
            "attribution": []
        }

        body.aggregations.geohash.buckets.forEach(function(bucket){
            var gh_bbox = geohash.decode_bbox(bucket.key);
            var poly = [
                [gh_bbox[1],gh_bbox[0]],
                [gh_bbox[3],gh_bbox[0]],
                [gh_bbox[3],gh_bbox[2]],
                [gh_bbox[1],gh_bbox[2]],
                [gh_bbox[1],gh_bbox[0]],
            ];
            rb.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    // TODO: Convert geohash to polygon.
                    "coordinates": [poly]
                },
                "properties": {
                    "geohash": bucket.key,
                    "itemCount": bucket.doc_count,
                }
            })
        });

        async.mapSeries(body.aggregations.rs.buckets,function(bucket,acb){
            var rs = {
                "uuid": bucket.key,
                "itemCount": bucket.doc_count
            };
            if (config.recordsets[bucket.key]) {
                _.defaults(rs,config.recordsets[bucket.key])
                acb(null,rs)
            } else {
                loadRecordsets(function(){
                    _.defaults(rs,config.recordsets[bucket.key])
                    acb(null,rs)
                });
            }
        },function(err,results){
            rb.attribution = results;
            cb(rb);
        });    
    }    

    return {
        basic: function(req, res) {

            var type = req.params.t;

            var q = getParam(req,"q",function(p){
                console.log(p);
                return JSON.parse(p);
            },{});

            var limit = getParam(req,"limit",function(p){
                return parseInt(p);
            },100);

            var offset = getParam(req,"offset",function(p){
                return parseInt(p);
            },0);            

            var sort = getParam(req,"sort",function(p){
                var s = {};
                s[p] = {"order":"asc"}
                return [s,{"dqs":{"order":"asc"}}];
            },[{"dqs":{"order":"asc"}}]);

            var query = queryShim(q);

            var wd = query;
            ["query","filtered","filter"].forEach(function(k){
                if (!wd[k]) {
                    wd[k] = {};
                }
                wd = wd[k];
            })
            if(!_.isArray(query["query"]["filtered"]["filter"]["and"])){
                query["query"]["filtered"]["filter"]["and"] = [];
            }            
            query["query"]["filtered"]["filter"]["and"].push({
                "exists": {
                    "field": "geopoint",
                }
            })
            query["aggs"] = {
                "rs": {
                    "terms": {
                        "field": "recordset",
                        "size": config.maxRecordsets
                    }
                },
                "geohash": {
                    "geohash_grid": {
                        "field": "geopoint",
                        "precision": 3,
                        "size": "500", // > (5*precision)^2
                    }
                }
            }
            query["from"] = offset;
            query["size"] = limit;

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                // console.log(body)
                var body = JSON.parse(body);

                if (type == "geohash") {
                    geoJsonGeohash(body,function(rb){
                        res.json(rb);
                    })
                } else {
                    geoJsonPoints(body,function(rb){
                        res.json(rb);
                    })
                }
            })
        },
        tiled: function(req, res) {

            var type = req.params.t;

            var z = req.params.z;
            var x = req.params.x;
            var y = req.params.y;

            var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z,x,y);
            //var gl = tileMath.zoom_to_geohash_len(z,false);

            var gl = 2;
            if (z < 2) {
                gl = 2;
            } else if ( z < 5 ) {
                gl = 3;
            } else if ( z < 8) {
                gl = 4;
            } else if ( z < 10) {
                gl = 5;
            } else {
                gl = 6;
            }            

            console.log(z,gl)

            var q = getParam(req,"q",function(p){
                return JSON.parse(p)
            },{});

            var limit = getParam(req,"limit",function(p){
                return parseInt(p);
            },100);

            var offset = getParam(req,"offset",function(p){
                return parseInt(p);
            },0);            

            var sort = getParam(req,"sort",function(p){
                var s = {};
                s[p] = {"order":"asc"}
                return [s,{"dqs":{"order":"asc"}}];
            },[{"dqs":{"order":"asc"}}]);              

            var query = queryShim(q);
            var wd = query;
            ["query","filtered","filter"].forEach(function(k){
                if (!wd[k]) {
                    wd[k] = {};
                }
                wd = wd[k];
            })
            if(!query["query"]["filtered"]["filter"]["and"]){
                query["query"]["filtered"]["filter"]["and"] = [];
            }
            query["query"]["filtered"]["filter"]["and"].push({
                "exists": {
                    "field": "geopoint",
                }
            })
            query["query"]["filtered"]["filter"]["and"].push({
                "geo_bounding_box" : {
                    "geopoint" : {
                        "top_left" : {
                            "lat" : tile_bbox[0][0],
                            "lon" : tile_bbox[0][1]
                        },
                        "bottom_right" : {
                            "lat" : tile_bbox[1][0],
                            "lon" : tile_bbox[1][1]
                        }
                    }
                }
            })            
            query["aggs"] = {
                "rs": {
                    "terms": {
                        "field": "recordset",
                        "size": config.maxRecordsets
                    }
                },
                "geohash": {
                    "geohash_grid": {
                        "field": "geopoint",
                        "precision": gl,
                        "size": "100000", // > (5*precision)^2
                    }
                }
            }
            query["from"] = offset;
            query["size"] = limit;

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                // console.log(body)
                var body = JSON.parse(body);

                if (type == "geohash") {
                    geoJsonGeohash(body,function(rb){
                        res.json(rb);
                    })
                } else {
                    geoJsonPoints(body,function(rb){
                        res.json(rb);
                    })
                }
            })   
        },
    }
}