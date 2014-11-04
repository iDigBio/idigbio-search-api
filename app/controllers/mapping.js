"use strict";

var request = require('request');
var _ = require("lodash");
var geohash = require("ngeohash");
var Canvas = require('canvas');
var Hashids = require('hashids');

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var tileMath = require("../lib/tile-math.js")(app,config);
    var getParam = require("../lib/get-param.js")(app,config);
    var cp = require("../lib/common-params.js")(app,config);
    var formatter = require("../lib/formatter.js")(app,config);
    var hasher = require("../lib/hasher.js")(app,config);

    var hashids = new Hashids("idigbio", 8);

    function drawCircle(context,x,y,radius,fillStyle,strokeStyle) {
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

        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
    }

    // function drawSquare(context,x,y,size,fillStyle,strokeStyle) {
    //     context.beginPath();
    //     context.fillRect(x,y,size,size);
    //     if(fillStyle){
    //         context.fillStyle = fillStyle;
    //     } else {
    //         context.fillStyle = 'green';
    //     }
    //     context.fill();
    //     context.lineWidth = 5;
    //     if(strokeStyle){
    //         context.strokeStyle = '#003300';
    //     } else {
    //         context.strokeStyle = '#003300';
    //     }
    //     context.stroke();
    // }

    function getStyle(style,properties) {
        var ret_style = {};
        _.keys(style).forEach(function(k){
            if (k !== "fill" && k !== "stroke" && k !== "doc_count") {
                if(properties[k]) {
                    if (style[k][properties[k]]) {
                        _.defaults(ret_style,style[k][properties[k]]);
                    }
                }
            }
        })
        _.defaults(ret_style,{
            fill: style.fill,
            stroke: style.stroke
        });
        return ret_style;
    }

    function getPointProps(hit) {
        var props = {
            "uuid": hit._id,
        }
        _.keys(hit._source).forEach(function(k){
            if (k !== "geopoint") {
                props[k] = hit._source[k];
            }
        })
        return props;
    }
    
    function getGeohashProps(bucket) {
        var props = {
            "geohash": bucket.key,
            "itemCount": bucket.doc_count,
        }

        return props;
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
        context.fillRect(pp[0][0],pp[0][1],xsize,ysize);
        context.strokeRect(pp[0][0],pp[0][1],xsize,ysize);
    }

    function geoJsonPoints(body,cb){
        var rb = {
            "itemCount": body.hits.total,
            "type": "FeatureCollection",
            "features": [],
            "attribution": []
        };

        body.hits.hits.forEach(function(hit){
            rb.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [hit._source.geopoint.lon, hit._source.geopoint.lat]
                },
                "properties": getPointProps(hit)
            });
        });
        formatter.attribution(body.aggregations.rs.buckets, function(results){
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
        };

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
                    "coordinates": [poly]
                },
                "properties": getGeohashProps(bucket)
            });
        });

        formatter.attribution(body.aggregations.rs.buckets, function(results){
            rb.attribution = results;
            cb(rb);            
        });
    }

    function tileGeohash(zoom,x,y,map_def,body,cb){
        var canvas = new Canvas(tileMath.TILE_SIZE,tileMath.TILE_SIZE);
        var context = canvas.getContext('2d');

        // Debug tile border
        // context.strokeStyle = '#FF0000';
        // context.lineWidth = 1;
        // context.strokeRect(0,0,255,255)

        var max_bucket_value = 1;
        try {
            max_bucket_value = body.aggregations.ggh.f.gh.buckets[0].doc_count;
        } catch(e) {}

        body.aggregations.geohash.buckets.forEach(function(bucket){
            var ttpp = tileMath.geohash_zoom_to_xy_tile_pixels_mercator_bbox(bucket["key"],zoom);

            var nw_ttpp = ttpp[0];
            var se_ttpp = ttpp[1];

            var nw_pp = tileMath.project_ttpp_to_current_tile_pixels(nw_ttpp,x,y);
            var se_pp = tileMath.project_ttpp_to_current_tile_pixels(se_ttpp,x,y);

            var prop_style = getStyle(map_def.style,getGeohashProps(bucket));
            var style = {}

            if (map_def.style.doc_count && _.isArray(map_def.style.doc_count) && map_def.style.doc_count.length >= 1) {
                var style_index = Math.min(Math.floor((bucket.doc_count/max_bucket_value)*map_def.style.doc_count.length),map_def.style.doc_count.length-1)
                _.defaults(style,map_def.style.doc_count[style_index]);
            }

            _.defaults(style,prop_style);

            drawBbox(context,[nw_pp,se_pp],style.fill,style.stroke);
        });

        canvas.toBuffer(cb);
    }

    function tilePoints(zoom,x,y,map_def,body,cb){
        var canvas = new Canvas(tileMath.TILE_SIZE,tileMath.TILE_SIZE);
        var context = canvas.getContext('2d');

        // Debug tile border
        // context.strokeStyle = '#FF0000';
        // context.lineWidth = 1;
        // context.strokeRect(0,0,255,255)

        var point_size = 2;

        body.hits.hits.forEach(function(hit){
            var ttpp = tileMath.lat_lon_zoom_to_xy_tile_pixels_mercator(hit._source.geopoint.lat,hit._source.geopoint.lon,zoom);

            var pp = tileMath.project_ttpp_to_current_tile_pixels(ttpp,x,y);

            var style = getStyle(map_def.style,getPointProps(hit));

            drawCircle(context,pp[0],pp[1],point_size,style.fill,style.stroke);
        });

        canvas.toBuffer(cb);
    }    

    function makeKeyDefined(path,wd){
        path.forEach(function(k){
            if (!wd[k]) {
                wd[k] = {};
            }
            wd = wd[k];
        });        
    }

    function mapDef(s, map_url, map_def, cb){
        var query = queryShim(map_def.rq);

        makeKeyDefined(["query","filtered","filter"],query);

        if(!query["query"]["filtered"]["filter"]["and"]){
            query["query"]["filtered"]["filter"]["and"] = [];
        }

        query["query"]["filtered"]["filter"]["and"].push({
            "exists": {
                "field": "geopoint",
            }
        });

        query["aggs"] = {
            "rs": {
                "terms": {
                    "field": "recordset",
                    "size": config.maxRecordsets
                }
            },
            "gh": {
                "geohash_grid": {
                    "field": "geopoint",
                    "precision": 3,
                    "size": "500", // > (5*precision)^2
                }      
            }              
        };
        query["size"] = 0;

        request.post({
            url: config.search.server + config.search.index + "records/_search",
            body: JSON.stringify(query)
        },function (error, response, body) {
            body = JSON.parse(body);

            var rb = {
                shortCode: s,
                tiles: map_url + "/{z}/{x}/{y}.png",
                geojson: map_url + "/{z}/{x}/{y}.json",
                points:  map_url + "/points",
                mapDefinition: map_def,
            }

            formatter.attribution(body.aggregations.rs.buckets, function(results){
                rb.attribution = results;
                cb(rb);
            });
        });        
    }

    return {
        // basic: function(req, res) {

        //     var type = req.params.t;

        //     var rq = cp.query("rq", req);

        //     var limit = cp.limit(req);

        //     var offset = cp.offset(req);

        //     var sort = cp.sort(req);

        //     var query = queryShim(rq);

        //     makeKeyDefined(["query","filtered","filter"],query);

        //     if(!_.isArray(query["query"]["filtered"]["filter"]["and"])){
        //         query["query"]["filtered"]["filter"]["and"] = [];
        //     }

        //     query["query"]["filtered"]["filter"]["and"].push({
        //         "exists": {
        //             "field": "geopoint",
        //         }
        //     });

        //     query["aggs"] = {
        //         "rs": {
        //             "terms": {
        //                 "field": "recordset",
        //                 "size": config.maxRecordsets
        //             }
        //         },
        //         "geohash": {
        //             "geohash_grid": {
        //                 "field": "geopoint",
        //                 "precision": 3,
        //                 "size": "500", // > (5*precision)^2
        //             }
        //         }
        //     };
        //     query["from"] = offset;
        //     query["size"] = limit;
        //     query["sort"] = sort;

        //     request.post({
        //         url: config.search.server + config.search.index + "records/_search",
        //         body: JSON.stringify(query)
        //     },function (error, response, body) {
        //         body = JSON.parse(body);

        //         if (type === "geohash") {
        //             geoJsonGeohash(body,function(rb){
        //                 res.json(rb);
        //             });
        //         } else if (type === "points") {
        //             geoJsonPoints(body,function(rb){
        //                 res.json(rb);
        //             });
        //         }
        //     });
        // },
        mapPoints: function(req, res) {
            var s = req.params.s;

            var limit = cp.limit(req);

            var offset = cp.offset(req);

            var sort = cp.sort(req);

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

            config.redis.client.get(s,function(err,rv){
                var map_def = JSON.parse(rv);

                var query = queryShim(map_def.rq);
                var type = map_def.type;

            
                makeKeyDefined(["query","filtered","filter"],query);

                if(!query["query"]["filtered"]["filter"]["and"]){
                    query["query"]["filtered"]["filter"]["and"] = [];
                }
                query["query"]["filtered"]["filter"]["and"].push({
                    "exists": {
                        "field": "geopoint",
                    }
                });
                query["query"]["filtered"]["filter"]["and"].push({
                    "geohash_cell" : {
                        "geopoint" : {
                            "lat": lat,
                            "lon": lon
                        },
                        "precision": gl,
                        "neighbors": true
                    }
                });
                query["aggs"] = {
                    "rs": {
                        "terms": {
                            "field": "recordset",
                            "size": config.maxRecordsets
                        }
                    }
                };
                query["from"] = offset;
                query["size"] = limit;
                query["sort"] = sort;

                request.post({
                    url: config.search.server + config.search.index + "records/_search",
                    body: JSON.stringify(query)
                },function (error, response, body) {
                    formatter.basic(body,res);
                });
            });
        },
        getMapTile: function(req, res) {
            var s = req.params.s;

            var x = parseInt(req.params.x);
            var y = parseInt(req.params.y);
            var z = parseInt(req.params.z);

            var response_type = req.params.t;

            var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z,x,y);
            var gl = tileMath.zoom_to_geohash_len(z,false);

            var g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
            var padding_size = 3;

            config.redis.client.get(s,function(err,rv){
                var map_def = JSON.parse(rv);

                var query = queryShim(map_def.rq);
                var type = map_def.type;

                makeKeyDefined(["query","filtered","filter"],query);

                if(!query["query"]["filtered"]["filter"]["and"]){
                    query["query"]["filtered"]["filter"]["and"] = [];
                }

                query["query"]["filtered"]["filter"]["and"].push({
                    "exists": {
                        "field": "geopoint",
                    }
                });

                var unboxed_filter = _.cloneDeep(query.query.filtered.filter);

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
                });
                if (type === "geohash") {
                    query["size"] = 0
                    query["aggs"] = {
                        "geohash": {
                            "geohash_grid": {
                                "field": "geopoint",
                                "precision": gl,
                                "size": config.maxTileObjects
                            }
                        },
                        "ggh": {
                            "global": {},
                            "aggs": {
                                "f": {
                                    "filter": unboxed_filter,
                                    "aggs": {
                                        "gh": {
                                            "geohash_grid": {
                                                "field": "geopoint",
                                                "precision": gl,
                                                "size": 1
                                            }      
                                        }
                                    }        
                                }                               
                            }
                        }                        
                    };
                } else if (type === "points") {
                    query["size"] = config.maxTileObjects;
                    query["_source"] = ["geopoint"];        
                    _.keys(map_def.style).forEach(function(k){
                        if (k !== "fill" && k !== "stroke") {
                            query["_source"].push(k)
                        }
                    })
                }

                if (response_type === "json") {
                    makeKeyDefined(["aggs"],query);
                    query["aggs"]["rs"] = {
                        "terms": {
                            "field": "recordset",
                            "size": config.maxRecordsets
                        }
                    };
                }

                request.post({
                    url: config.search.server + config.search.index + "records/_search",
                    body: JSON.stringify(query)
                },function (error, response, body) {
                    body = JSON.parse(body);

                    if (response_type === "json") {
                        if (type === "geohash") {
                            geoJsonGeohash(body,function(rb){
                                res.json(rb);
                            });
                        } else if (type === "points") {
                            geoJsonPoints(body,function(rb){
                                res.json(rb);
                            });
                        }
                    } else {
                        if (type === "geohash") {
                            tileGeohash(z,x,y,map_def,body,function(err,png_buff){
                                res.type('png');
                                res.send(png_buff);
                            });
                        } else if (type === "points") {
                            tilePoints(z,x,y,map_def,body,function(err,png_buff){
                                res.type('png');
                                res.send(png_buff);
                            });
                        }                        
                    }
                });
            });
        },
        createMap: function(req,res){
            var rq = cp.query("rq", req);           

            var type = getParam(req,"type",function(p){
                if (p === "points") {
                    return "points";
                } else {
                    return "geohash";
                }
            },"geohash");

            var default_style = {
                fill: 'rgba(0,255,0,.4)',
                stroke: 'rgba(0,255,0,.6)'                
            };

            var style = getParam(req,"style",function(p){
                return JSON.parse(p);
            },default_style);

            _.defaults(style,default_style);

            var map_def = {
                rq: rq,
                type: type,
                style: style
            };

            var h = hasher.hash("sha1",map_def);

            config.redis.client.exists(h,function(err,map_exists){
                if (map_exists) {
                    config.redis.client.get(h,function(err,s){
                        config.redis.client.get(s,function(err,stored_map_def){
                            var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;
                            
                            mapDef(s, map_url,map_def,function(rb){
                                res.json(rb);
                            })
                        })
                    })
                } else {
                    config.redis.client.incr("queryid",function(err,v){
                        var s = hashids.encode(v);    
                        config.redis.client.set(s,JSON.stringify(map_def),function(err,good){
                            config.redis.client.set(h,s,function(err,good){
                                var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;
                                
                                mapDef(s, map_url,map_def,function(rb){
                                    res.json(rb);
                                })                           
                            });
                        })
                    });                

                }
            })
        },
        getMap: function(req, res) {
            var s = req.params.s;          

            config.redis.client.get(s,function(err,rv){
                var map_def = JSON.parse(rv);
                var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;
                
                mapDef(s,map_url,map_def,function(rb){
                    res.json(rb);
                })
            });
        }
    };
};