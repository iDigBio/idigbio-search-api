"use strict";

var request = require('request');
var _ = require("lodash");
var geohash = require("ngeohash");
var Canvas = require('canvas');
var Hashids = require('hashids');
var chroma = require('chroma-js');

var path = require('path');

var mapnik = require('mapnik'),
    mercator = require('../lib/sphericalmercator');

mapnik.Logger.setSeverity(mapnik.Logger.DEBUG)

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'csv.input'));

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
        context.arc(x, y, radius, 0, 6 * Math.PI, false);
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

        var map = new mapnik.Map(tileMath.TILE_SIZE,tileMath.TILE_SIZE);

        var max_bucket_value = 1;
        try {
            max_bucket_value = body.aggregations.ggh.f.gh.buckets[0].doc_count;
        } catch(e) {}


        var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
        s += '  <Style name="style" filter-mode="first">\n';

        var scale = chroma.scale(map_def.style.scale).domain([1, max_bucket_value], 10, 'log');
        scale.domain().forEach(function(domain){
            var fl = scale.mode('lab')(domain);
            s += '    <Rule>\n';
            s += '        <Filter>[count] &lt;= ' + Math.ceil(domain) + '</Filter>\n';
            s += '        <PolygonSymbolizer fill="' + fl.alpha(0.7).css() + '" clip="true" />\n';
            s += '        <LineSymbolizer stroke="' + fl.darker(0.2).alpha(0.7).css() + '" stroke-width=".2" clip="true" />\n';
            s += '    </Rule>\n';                    
        })
        s += '    <Rule>\n';
        s += '        <ElseFilter/>\n';
        s += '        <PolygonSymbolizer fill="black" clip="true" />\n';
        s += '        <LineSymbolizer stroke="black" stroke-width=".2" clip="true" />\n';
        s += '    </Rule>\n';       
        s += '  </Style>\n';
        s += '</Map>';

        var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
        map.fromString(s,
          {strict: true, base: './'},
          function(err, map) {
              if (err) {
                cb(err,undefined)
              }

            var csv_string = "count,geojson\n";
            var proj = new mapnik.Projection('+init=epsg:3857');
            var wgs84 = new mapnik.Projection('+init=epsg:4326');
            var trans = new mapnik.ProjTransform(wgs84,proj);

            body.aggregations.geohash.buckets.forEach(function(bucket){
                var gh_bbox = geohash.decode_bbox(bucket.key);
                var poly = [
                    [gh_bbox[1],gh_bbox[0]],
                    [gh_bbox[3],gh_bbox[0]],
                    [gh_bbox[3],gh_bbox[2]],
                    [gh_bbox[1],gh_bbox[2]],
                    [gh_bbox[1],gh_bbox[0]],
                ];
                var f = new mapnik.Feature.fromJSON(JSON.stringify({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly]
                    },
                    "properties": getGeohashProps(bucket)
                }));
                csv_string += bucket.doc_count + ",'" + f.geometry().toJSON({transform: trans}) + "'\n";
            });

            var ds = new mapnik.Datasource({type:'csv', 'inline': csv_string});
              var l = new mapnik.Layer('test');
              l.srs = map.srs;
              l.styles = ['style'];
              l.datasource = ds;
              map.add_layer(l);
              map.extent = bbox;
              var im = new mapnik.Image(map.width, map.height);
              map.render(im, function(err, im) {
                  cb(err,im.encodeSync('png'));
              });
            }
        );
    }

    function tilePoints(zoom,x,y,map_def,body,cb){
        var map = new mapnik.Map(tileMath.TILE_SIZE,tileMath.TILE_SIZE);

        var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">';
        s += '<Style name="style">';
        s += ' <Rule>';
        s += '  <MarkersSymbolizer marker-type="ellipse" fill="red" width="5" allow-overlap="true" placement="point"/>';
        s += ' </Rule>';
        s += '</Style>';
        s += '</Map>';

        var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
        map.fromString(s,
          {strict: true, base: './'},
          function(err, map) {
              if (err) {
                cb(err,undefined)
              }

              var options = {
                  extent: '-20037508.342789,-8283343.693883,20037508.342789,18365151.363070'
              };

              var mem_ds = new mapnik.MemoryDatasource({});
              var proj = new mapnik.Projection('+init=epsg:3857');

              body.hits.hits.forEach(function(hit){
                    var xy = proj.forward([hit._source.geopoint.lon,hit._source.geopoint.lat]);

                     mem_ds.add({
                                  'x' : xy[0],
                                  'y' : xy[1],
                                  'properties': {}
                                });
              });

              var l = new mapnik.Layer('test');
              l.srs = map.srs;
              l.styles = ['style'];
              l.datasource = mem_ds;
              map.add_layer(l);
              map.extent = bbox;
              var im = new mapnik.Image(map.width, map.height);
              map.render(im, function(err, im) {
                  cb(err,im.encodeSync('png'));
              });
            }
        );
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
    
    function makeBasicFilter(map_def){
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
        return query;
    }

    function makeMapTile(req, res, map_def, count) {
        //var s = req.params.s;

        var x = parseInt(req.params.x);
        var y = parseInt(req.params.y);
        var z = parseInt(req.params.z);

        var response_type = req.params.t;

        var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z,x,y);
        var gl = tileMath.zoom_to_geohash_len(z,false);
        var g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
        var padding_size = 3;

 
        var type = map_def.type;
        var threshold = map_def.threshold;
         
        var query = makeBasicFilter(map_def);

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
        if (type === "geohash" || (type === "auto" && count > threshold )) {
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
        } else if (type === "points" || (type === "auto" && count <= threshold)) {
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

        var typeGeohash = function(body){
            tileGeohash(z,x,y,map_def,body,function(err,png_buff){
                res.type('png');
                res.send(png_buff);
            });
        }

        var typePoints = function(body){
            tilePoints(z,x,y,map_def,body,function(err,png_buff){
                res.type('png');
                res.send(png_buff);
            });                    
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
                    typeGeohash(body);
                } else if (type === "points") {
                    typePoints(body)
                } else if (type === "auto") {
                    if(count>threshold){
                        typeGeohash(body);
                    }else{
                        typePoints(body);
                    }
                }                       
            }
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
                if (!rv) {
                    res.status(404).json({
                        "error": "Not Found",
                        "statusCode": 404
                    });
                    return
                }

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
        getMapTile: function(req, res){
            var self=this;
            config.redis.client.get(req.params.s,function(err,rv){
                if (!rv) {
                    res.status(404).json({
                        "error": "Not Found",
                        "statusCode": 404
                    });
                    return
                }
                var map_def = JSON.parse(rv);
                var count=0;
                if(map_def.type === 'auto'){
                    var query= makeBasicFilter(map_def);
                    request.post({
                        url: config.search.server + config.search.index + "records/_count",
                        body: JSON.stringify(query)
                    },function (error, response, body) {
                        body = JSON.parse(body);
                        count = body.count;
                        makeMapTile(req,res,map_def,count);
                    });
                }else{
                    makeMapTile(req,res,map_def,count);
                }
            });            
        },


        createMap: function(req,res){
            var rq = cp.query("rq", req);           

            var type = getParam(req,"type",function(p){
                if (p === "points") {
                    return "points";
                } else if(p === "auto"){
                    return "auto";
                } else {
                    return "geohash";
                }
            },"geohash");

            var threshold = getParam(req,"threshold",function(p){
                if(_.isFinite(p)){
                    return p;
                }else{
                    return 5000;
                }
            },5000);

            var default_style = {
                fill: 'rgba(0,255,0,.4)',
                stroke: 'rgba(0,255,0,.6)',
                scale: 'YlOrRd'
            };

            var style = getParam(req,"style",function(p){
                try {
                    return JSON.parse(p);
                }catch(e){
                    return p
                }
            },default_style);

            _.defaults(style,default_style);

            var map_def = {
                rq: rq,
                type: type,
                style: style,
                threshold: threshold
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
                if (!rv) {
                    res.status(404).json({
                        "error": "Not Found",
                        "statusCode": 404
                    });
                    return
                }
                
                var map_def = JSON.parse(rv);
                var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;
                
                mapDef(s,map_url,map_def,function(rb){
                    res.json(rb);
                })
            });
        }
    };
};
