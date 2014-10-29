var request = require('request');
var _ = require("lodash");
var async = require("async");
var geohash = require("ngeohash");
var Canvas = require('canvas')

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var loadRecordsets = require("../lib/load-recordsets.js")(app,config);
    var tileMath = require("../lib/tile-math.js")(app,config);
    var getParam = require("../lib/get-param.js")(app,config);
    var formatter = require("../lib/formatter.js")(app,config);

    function drawCircle(context,x,y,radius,fillStyle,strokeStyle) {
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        if(fillStyle){
            context.fillStyle = fillStyle;
        } else {
            context.fillStyle = 'green';
        }
        context.fill();
        context.lineWidth = 5;
        if(strokeStyle){
            context.strokeStyle = '#003300';
        } else {
            context.strokeStyle = '#003300';
        }
        context.stroke();
    }

    function drawSquare(context,x,y,size,fillStyle,strokeStyle) {
        context.beginPath();
        context.fillRect(x,y,size,size)
        if(fillStyle){
            context.fillStyle = fillStyle;
        } else {
            context.fillStyle = 'green';
        }
        context.fill();
        context.lineWidth = 5;
        if(strokeStyle){
            context.strokeStyle = '#003300';
        } else {
            context.strokeStyle = '#003300';
        }
        context.stroke();
    }

    function drawBbox(context,pp,fillStyle,strokeStyle) {

        var xsize = pp[0][0] - pp[1][0];
        var ysize = pp[0][1] - pp[1][1];

        // console.log(pp[0][0],pp[0][1],xsize,ysize)

        if(fillStyle){
            context.fillStyle = fillStyle;
        } else {
            context.fillStyle = 'rgba(0,255,0,.4)';
        }
        if(strokeStyle){
            context.strokeStyle = strokeStyle;
        } else {
            context.strokeStyle = 'rgba(0,255,0,.6)';
        }
        context.lineWidth = 1;
        context.fillRect(pp[0][0],pp[0][1],xsize,ysize)
        context.strokeRect(pp[0][0],pp[0][1],xsize,ysize)
    }

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

    var oor_count = 0;
    function tileGeohash(zoom,x,y,body,cb){
        var canvas = new Canvas(tileMath.TILE_SIZE,tileMath.TILE_SIZE)
        var context = canvas.getContext('2d');

        // Debug tile border
        // context.strokeStyle = '#FF0000';
        // context.lineWidth = 1;
        // context.strokeRect(0,0,255,255)

        body.aggregations.geohash.buckets.forEach(function(bucket){
            var ttpp = tileMath.geohash_zoom_to_xy_tile_pixels_mercator_bbox(bucket["key"],zoom);

            var nw_ttpp = ttpp[0];
            var se_ttpp = ttpp[1];

            // if(nw_ttpp[0][0] <= x && x <= se_ttpp[0][0] && nw_ttpp[0][1] <= y && y <= se_ttpp[0][1]){
                var nw_pp = [
                    nw_ttpp[1][0] + (nw_ttpp[0][0]-x)*tileMath.TILE_SIZE,
                    nw_ttpp[1][1] + (nw_ttpp[0][1]-y)*tileMath.TILE_SIZE
                ];

                var se_pp = [
                    se_ttpp[1][0] + (se_ttpp[0][0]-x)*tileMath.TILE_SIZE,
                    se_ttpp[1][1] + (se_ttpp[0][1]-y)*tileMath.TILE_SIZE
                ]

                console.log([nw_pp,se_pp])

                drawBbox(context,[nw_pp,se_pp])
            // } else {
            //     oor_count += 1;
            //     console.log(nw_ttpp[0][0],x,se_ttpp[0][0])
            //     console.log(nw_ttpp[0][1],y,se_ttpp[0][1])
            //     console.log("oor", oor_count, zoom, x, y, bucket["key"], ttpp)
            // }
        });

        canvas.toBuffer(cb)
    }

    return {
        basic: function(req, res) {

            var type = req.params.t;

            var rq = getParam(req,"rq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p)
                }
                return p
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

            var query = queryShim(rq);

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

            var x = req.params.x;
            var y = req.params.y;
            var z = req.params.z;

            if (y.slice(-4) == ".png") {
                y = y.slice(0,-4)
            }

            x = parseInt(x);
            y = parseInt(y);
            z = parseInt(z);

            var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z,x,y);
            var gl = tileMath.zoom_to_geohash_len(z,false);

            var g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
            var padding_size = 3;

            var rq = getParam(req,"rq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p)
                }
                return p
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

            var query = queryShim(rq);
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
                            "lat" : tile_bbox[0][0] + (g_bbox_size[0]*padding_size),
                            "lon" : tile_bbox[0][1] - (g_bbox_size[1]*padding_size)
                        },
                        "bottom_right" : {
                            "lat" : tile_bbox[1][0] - (g_bbox_size[0]*padding_size),
                            "lon" : tile_bbox[1][1] + (g_bbox_size[1]*padding_size)
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
                } else if (type == "tile") {
                    tileGeohash(z,x,y,body,function(err,png_buff){
                        res.send(png_buff);
                    })
                } else {
                    geoJsonPoints(body,function(rb){
                        res.json(rb);
                    })
                }
            })
        },
        mapPoints: function(req, res) {
            var rq = getParam(req,"rq",function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p)
                }
                return p
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

            var lat = getParam(req,"lat",function(p){
                return parseFloat(p);
            },0);

            var lon = getParam(req,"lon",function(p){
                return parseFloat(p);
            },0);

            var z = getParam(req,"zoom",function(p){
                return parseInt(p);
            },0);

            var gl = tileMath.zoom_to_geohash_len(z,false);

            var query = queryShim(rq);
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
                "geohash_cell" : {
                    "geopoint" : {
                        "lat": lat,
                        "lon": lon
                    },
                    "precision": gl,
                    "neighbors": true
                }
            })
            query["aggs"] = {
                "rs": {
                    "terms": {
                        "field": "recordset",
                        "size": config.maxRecordsets
                    }
                }
            }
            query["from"] = offset;
            query["size"] = limit;

            request.post({
                url: config.search.server + config.search.index + "records/_search",
                body: JSON.stringify(query)
            },function (error, response, body) {
                formatter.basic(body,res);
            })
        },
    }
}