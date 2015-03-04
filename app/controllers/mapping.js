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

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins, 'csv.input'));

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app, config);
    var tileMath = require("../lib/tile-math.js")(app, config);
    var getParam = require("../lib/get-param.js")(app, config);
    var cp = require("../lib/common-params.js")(app, config);
    var formatter = require("../lib/formatter.js")(app, config);
    var hasher = require("../lib/hasher.js")(app, config);

    var hashids = new Hashids("idigbio", 8);

    function getPointProps(hit) {
        var props = {
            "uuid": hit._id,
        }
        _.keys(hit._source).forEach(function(k) {
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

    function geoJsonPoints(body, cb) {
        var rb = {
            "itemCount": body.hits.total,
            "type": "FeatureCollection",
            "features": [],
            "attribution": []
        };

        body.hits.hits.forEach(function(hit) {
            rb.features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [hit._source.geopoint.lon, hit._source.geopoint.lat]
                },
                "properties": getPointProps(hit)
            });
        });
        formatter.attribution(body.aggregations.rs.buckets, function(results) {
            rb.attribution = results;
            cb(rb);
        });
    }

    function geoJsonGeohash(body, cb) {
        var rb = {
            "itemCount": body.hits.total,
            "type": "FeatureCollection",
            "features": [],
            "attribution": []
        };

        body.aggregations.geohash.buckets.forEach(function(bucket) {
            var gh_bbox = geohash.decode_bbox(bucket.key);
            var poly = [
                [gh_bbox[1], gh_bbox[0]],
                [gh_bbox[3], gh_bbox[0]],
                [gh_bbox[3], gh_bbox[2]],
                [gh_bbox[1], gh_bbox[2]],
                [gh_bbox[1], gh_bbox[0]],
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

        formatter.attribution(body.aggregations.rs.buckets, function(results) {
            rb.attribution = results;
            cb(rb);
        });
    }

    function styleJSON(map_def, body) {
        var rv = {
            "colors": {}
        };

        var order = [];

        if (map_def.type == "geohash") {
            var max_bucket_value = 1;
            try {
                max_bucket_value = body.aggregations.ggh.f.gh.buckets[0].doc_count;
            } catch (e) {}

            var scale = chroma.scale(map_def.style.scale).domain([1, max_bucket_value], 10, 'log');
            scale.domain().forEach(function(domain) {
                domain = Math.ceil(domain);
                var fl = scale.mode('lab')(domain);
                order.push(domain);
                rv["colors"][domain] = {
                    "fill": fl.alpha(0.7).css(),
                    "stroke": fl.darker(0.2).alpha(0.7).css()
                }
            })
            rv["default"] = {
                "fill": "black",
                "stroke": "black"
            }            
        } else {
            var colorCount = body.aggregations.gstyle.f.style.buckets.length + 1;
            var scale = chroma.scale(map_def.style.pointScale).domain([0, colorCount], colorCount);
            for (var i = 0; i < body.aggregations.gstyle.f.style.buckets.length; i++) {
                var b = body.aggregations.gstyle.f.style.buckets[i];
                order.push(b.key);
                var fl = scale.mode('lab')(i);
                rv["colors"][b.key] = {
                    "fill": fl.alpha(0.7).css(),
                    "stroke": chroma("black").alpha(0.7).css(),
                    "itemCount": b["doc_count"]
                }
            }
            var fl = scale.mode('lab')(colorCount);
            rv["default"] = {
                "fill": fl.alpha(0.7).css(),
                "stroke": chroma("black").alpha(0.7).css()
            }
        }
        rv["order"] = order;

        return rv;
    }

    var styleOnRule = _.template("<Rule>\n<Filter>[<%= field %>] = '<%= key %>'</Filter>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
    var pointElseRule = _.template("<Rule>\n<ElseFilter/>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
    var countRule = _.template("<Rule>\n<Filter>[count] &lt;= <%= key %></Filter>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");
    var geohashElseRule = _.template("<Rule>\n<ElseFilter/>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");

    function tileGeohash(zoom, x, y, map_def, body, cb, render_type) {

        var map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);

        var sj = styleJSON(map_def,body);

        var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
        s += '  <Style name="style" filter-mode="first">\n';

        sj.order.forEach(function(key) {
            s += countRule({
                key: key,
                fill: sj["colors"][key]["fill"],
                stroke: sj["colors"][key]["stroke"],
            })
        })
        s += geohashElseRule({
            fill: sj["default"]["fill"],
            stroke: sj["default"]["stroke"],
        })

        s += '  </Style>\n';
        s += '</Map>';

        var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
        map.fromString(s, {
                strict: true,
                base: './'
            },
            function(err, map) {
                if (err) {
                    cb(err, undefined)
                }

                var csv_string = "id,count,geojson\n";
                var proj = new mapnik.Projection('+init=epsg:3857');
                var wgs84 = new mapnik.Projection('+init=epsg:4326');
                var trans = new mapnik.ProjTransform(wgs84, proj);

                body.aggregations.geohash.buckets.forEach(function(bucket) {
                    var gh_bbox = geohash.decode_bbox(bucket.key);
                    var poly = [
                        [gh_bbox[1], gh_bbox[0]],
                        [gh_bbox[3], gh_bbox[0]],
                        [gh_bbox[3], gh_bbox[2]],
                        [gh_bbox[1], gh_bbox[2]],
                        [gh_bbox[1], gh_bbox[0]],
                    ];
                    var f = new mapnik.Feature.fromJSON(JSON.stringify({
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [poly]
                        },
                        "properties": getGeohashProps(bucket)
                    }));
                    csv_string += bucket.key + "," + bucket.doc_count + ",'" + f.geometry().toJSON({
                        transform: trans
                    }) + "'\n";
                });

                var ds = new mapnik.Datasource({
                    type: 'csv',
                    'inline': csv_string
                });
                var l = new mapnik.Layer('test');
                l.srs = map.srs;
                l.styles = ['style'];
                l.datasource = ds;
                map.add_layer(l);
                map.extent = bbox;
                if (render_type === "grid.json") {
                    var grid = new mapnik.Grid(map.width, map.height, {key: "id"});
                    map.render(grid, {layer: 0, "fields": ["count"]}, function(err, grid2) {
                        cb(err, grid2.encodeSync('utf'));
                    });
                } else {
                    var im = new mapnik.Image(map.width, map.height);
                    map.render(im, function(err, im) {
                        cb(err, im.encodeSync('png'));
                    });
                }
            }
        );
    }

    function tilePoints(zoom, x, y, map_def, body, cb, render_type) {
        var map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);

        var sj = styleJSON(map_def,body);

        var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
        s += '  <Style name="style" filter-mode="first">\n';

        sj.order.forEach(function(key) {
            s += styleOnRule({
                field: map_def.style.styleOn,
                key: key,
                fill: sj["colors"][key]["fill"],
                stroke: sj["colors"][key]["stroke"],
            })
        })
        s += pointElseRule({
            fill: sj["default"]["fill"],
            stroke: sj["default"]["stroke"],
        })

        s += '  </Style>\n';
        s += '</Map>';

        var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
        map.fromString(s, {
                strict: true,
                base: './'
            },
            function(err, map) {
                if (err) {
                    cb(err, undefined)
                }

                var options = {
                    extent: '-20037508.342789,-8283343.693883,20037508.342789,18365151.363070'
                };

                var mem_ds = new mapnik.MemoryDatasource({});
                var proj = new mapnik.Projection('+init=epsg:3857');

                body.hits.hits.forEach(function(hit) {
                    var xy = proj.forward([hit._source.geopoint.lon, hit._source.geopoint.lat]);

                    var f = {
                        'x': xy[0],
                        'y': xy[1],
                        'properties': {
                            'id': hit._id
                        }
                    }
                    f["properties"][map_def.style.styleOn] = hit._source[map_def.style.styleOn]

                    mem_ds.add(f);
                });

                var l = new mapnik.Layer('test');
                l.srs = map.srs;
                l.styles = ['style'];
                l.datasource = mem_ds;
                map.add_layer(l);
                map.extent = bbox;
                if (render_type === "grid.json") {
                    var grid = new mapnik.Grid(map.width, map.height, {key: "id"});
                    map.render(grid, {layer: 0, "fields": [map_def.style.styleOn]}, function(err, grid2) {
                        cb(err, grid2.encodeSync('utf'));
                    });
                } else {
                    var im = new mapnik.Image(map.width, map.height);
                    map.render(im, function(err, im) {
                        cb(err, im.encodeSync('png'));
                    });
                }
            }
        );
    }

    function makeKeyDefined(path, wd) {
        path.forEach(function(k) {
            if (!wd[k]) {
                wd[k] = {};
            }
            wd = wd[k];
        });
    }

    function mapDef(s, map_url, map_def, cb) {
        var query = queryShim(map_def.rq);

        makeKeyDefined(["query", "filtered", "filter"], query);

        if (!query["query"]["filtered"]["filter"]["and"]) {
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
        }, function(error, response, body) {
            body = JSON.parse(body);

            var rb = {
                shortCode: s,
                tiles: map_url + "/{z}/{x}/{y}.png",
                geojson: map_url + "/{z}/{x}/{y}.json",
                utf8grid: map_url + "/{z}/{x}/{y}.grid.json",
                points: map_url + "/points",
                mapDefinition: map_def,
            }

            formatter.attribution(body.aggregations.rs.buckets, function(results) {
                rb.attribution = results;
                cb(rb);
            });
        });
    }

    function makeBasicFilter(map_def) {
        var query = queryShim(map_def.rq);

        makeKeyDefined(["query", "filtered", "filter"], query);

        if (!query["query"]["filtered"]["filter"]["and"]) {
            query["query"]["filtered"]["filter"]["and"] = [];
        }

        query["query"]["filtered"]["filter"]["and"].push({
            "exists": {
                "field": "geopoint",
            }
        });
        return query;
    }

    function makeTileQuery(map_def, z, x, y, response_type) {
        var query = makeBasicFilter(map_def);

        var unboxed_query = _.cloneDeep(query.query);

        var gl = tileMath.zoom_to_geohash_len(z, false);
        var g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
        var padding_size = 3;

        var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z, x, y);
        query["query"]["filtered"]["filter"]["and"].push({
            "geo_bounding_box": {
                "geopoint": {
                    "top_left": {
                        "lat": tile_bbox[0][0] + (g_bbox_size[0] * padding_size),
                        "lon": tile_bbox[0][1] - (g_bbox_size[1] * padding_size)
                    },
                    "bottom_right": {
                        "lat": tile_bbox[1][0] - (g_bbox_size[0] * padding_size),
                        "lon": tile_bbox[1][1] + (g_bbox_size[1] * padding_size)
                    }
                }
            }
        });

        if (map_def.type === "geohash") {
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
                            "filter": {
                                "query": unboxed_query,
                            },
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
        } else if (map_def.type === "points") {
            query["size"] = config.maxTileObjects;
            query["_source"] = ["geopoint", map_def.style.styleOn];
            query["aggs"] = {
                "gstyle": {
                    "global": {},
                    "aggs": {
                        "f": {
                            "filter": {
                                "query": unboxed_query,
                            },
                            "aggs": {
                                "style": {
                                    "terms": {
                                        "field": map_def.style.styleOn,
                                        "size": 10
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (response_type === "json") {
            makeKeyDefined(["aggs"], query);
            query["aggs"]["rs"] = {
                "terms": {
                    "field": "recordset",
                    "size": config.maxRecordsets
                }
            };
        }

        return query;
    }

    function getMapDef(req, res, next, cb) {
        var self = this;
        config.redis.client.get(req.params.s, function(err, rv) {
            if (!rv) {
                res.status(404).json({
                    "error": "Not Found",
                    "statusCode": 404
                });
                next();
                return
            }
            var map_def = JSON.parse(rv);
            var count = 0;
            if (map_def.type === 'auto') {
                var query = makeBasicFilter(map_def);
                request.post({
                    url: config.search.server + config.search.index + "records/_count",
                    body: JSON.stringify(query)
                }, function(error, response, body) {
                    body = JSON.parse(body);
                    count = body.count;

                    if (count > map_def.threshold) {
                        map_def.type = "geohash"
                    } else {
                        map_def.type = "points"
                    }
                    cb(map_def);
                });
            } else {
                cb(map_def);
            }
        });
    }

    function makeMapTile(req, res, next, map_def, count) {
        //var s = req.params.s;

        var x = parseInt(req.params.x);
        var y = parseInt(req.params.y);
        var z = parseInt(req.params.z);

        var response_type = req.params.t;

        if(req.params.y.slice(-5) == ".grid") {
            response_type = "grid." + response_type;
        }

        var query = makeTileQuery(map_def, z, x, y, response_type);

        var typeGeohash = function(body, response_type) {
            tileGeohash(z, x, y, map_def, body, function(err, png_buff) {
                if (response_type === "grid.json") {
                    res.json(png_buff);
                    next();
                } else {
                    res.type('png');
                    res.send(png_buff);
                    next();
                }
            }, response_type);
        }

        var typePoints = function(body, response_type) {
            tilePoints(z, x, y, map_def, body, function(err, png_buff) {
                if (response_type === "grid.json") {
                    res.json(png_buff);
                    next();
                } else {
                    res.type('png');
                    res.send(png_buff);
                    next();
                }
            }, response_type);
        }

        request.post({
            url: config.search.server + config.search.index + "records/_search",
            body: JSON.stringify(query)
        }, function(error, response, body) {
            body = JSON.parse(body);

            if (response_type === "json") {
                if (map_def.type === "geohash") {
                    geoJsonGeohash(body, function(rb) {
                        res.json(rb);
                        next();
                    });
                } else {
                    geoJsonPoints(body, function(rb) {
                        res.json(rb);
                        next();
                    });
                }
            } else if (response_type === "grid.json") {
                if (map_def.type === "geohash") {
                    typeGeohash(body, response_type);
                } else {
                    typePoints(body, response_type)
                }
            } else {
                if (map_def.type === "geohash") {
                    typeGeohash(body);
                } else {
                    typePoints(body)
                }
            }
        });
    }

    return {
        // basic: function(req, res, next) {

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
        //                 next();
        //             });
        //         } else if (type === "points") {
        //             geoJsonPoints(body,function(rb){
        //                 res.json(rb);
        //                 next();
        //             });
        //         }
        //     });
        // },
        mapPoints: function(req, res, next) {
            var s = req.params.s;

            var limit = cp.limit(req);

            var offset = cp.offset(req);

            var sort = cp.sort(req);

            var lat = getParam(req, "lat", function(p) {
                return parseFloat(p);
            }, 0);

            var lon = getParam(req, "lon", function(p) {
                return parseFloat(p);
            }, 0);

            while (lon > 180) {
                   lon -= 360;
            }

            while (lon < -180) {
                   lon += 360;
            }

            var z = getParam(req, "zoom", function(p) {
                return parseInt(p);
            }, 0);

            var gl = tileMath.zoom_to_geohash_len(z, false);

            var gh = geohash.encode(lat,lon,gl);
            var meta_bbox = geohash.decode_bbox(gh);
            geohash.neighbors(gh).forEach(function(n){
                var nbb = geohash.decode_bbox(n);
                if (nbb[0] < meta_bbox[0]) {
                    meta_bbox[0] = nbb[0];
                }
                if (nbb[1] < meta_bbox[1]) {
                    meta_bbox[1] = nbb[1];
                }
                if (nbb[2] > meta_bbox[2]) {
                    meta_bbox[2] = nbb[2];
                }
                if (nbb[3] > meta_bbox[3]) {
                    meta_bbox[3] = nbb[3];
                }
            })

            config.redis.client.get(s, function(err, rv) {
                if (!rv) {
                    res.status(404).json({
                        "error": "Not Found",
                        "statusCode": 404
                    });
                    next();
                    return
                }

                var map_def = JSON.parse(rv);

                var query = queryShim(map_def.rq);
                var type = map_def.type;

                makeKeyDefined(["query", "filtered", "filter"], query);

                if (!query["query"]["filtered"]["filter"]["and"]) {
                    query["query"]["filtered"]["filter"]["and"] = [];
                }
                query["query"]["filtered"]["filter"]["and"].push({
                    "exists": {
                        "field": "geopoint",
                    }
                });
                query["query"]["filtered"]["filter"]["and"].push({
                    "geohash_cell": {
                        "geopoint": {
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
                }, function(error, response, body) {
                    formatter.basic(body, res, next, {
                        "bbox": {
                            "nw": {
                                "lat": meta_bbox[2],
                                "lon": meta_bbox[1]
                            },
                            "se": {
                                "lat": meta_bbox[0],
                                "lon": meta_bbox[3]
                            }
                        }
                    });
                });
            });
        },

        getMapStyle: function(req, res, next) {
            getMapDef(req, res, next,function(map_def){
                var query = makeTileQuery(map_def, req.params.z, 0, 0);
                request.post({
                    url: config.search.server + config.search.index + "records/_search",
                    body: JSON.stringify(query)
                }, function(error, response, body) {
                    res.json(styleJSON(map_def,JSON.parse(body)));
                    next();
                });
            });
        },

        getMapTile: function(req, res, next) {
            getMapDef(req, res, next,function(map_def){
                makeMapTile(req, res, next, map_def);
            });
        },

        createMap: function(req, res, next) {
            var rq = cp.query("rq", req);

            var type = getParam(req, "type", function(p) {
                if (p === "points") {
                    return "points";
                } else if (p === "auto") {
                    return "auto";
                } else {
                    return "geohash";
                }
            }, "geohash");

            var threshold = getParam(req, "threshold", function(p) {
                if (_.isFinite(p)) {
                    return p;
                } else {
                    return 5000;
                }
            }, 5000);

            var default_style = {
                scale: 'YlOrRd',
                pointScale: 'Paired',
                styleOn: "scientificname"
            };

            var style = getParam(req, "style", function(p) {
                try {
                    return JSON.parse(p);
                } catch (e) {
                    return p
                }
            }, default_style);

            _.defaults(style, default_style);

            var map_def = {
                rq: rq,
                type: type,
                style: style,
                threshold: threshold
            };

            var h = hasher.hash("sha1", map_def);

            config.redis.client.exists(h, function(err, map_exists) {
                if (map_exists) {
                    config.redis.client.get(h, function(err, s) {
                        config.redis.client.get(s, function(err, stored_map_def) {
                            var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;

                            mapDef(s, map_url, map_def, function(rb) {
                                res.json(rb);
                                next();
                            })
                        })
                    })
                } else {
                    config.redis.client.incr("queryid", function(err, v) {
                        var s = hashids.encode(v);
                        config.redis.client.set(s, JSON.stringify(map_def), function(err, good) {
                            config.redis.client.set(h, s, function(err, good) {
                                var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;

                                mapDef(s, map_url, map_def, function(rb) {
                                    res.json(rb);
                                    next();
                                })
                            });
                        })
                    });

                }
            })
        },
        getMap: function(req, res, next) {
            var s = req.params.s;

            config.redis.client.get(s, function(err, rv) {
                if (!rv) {
                    res.status(404).json({
                        "error": "Not Found",
                        "statusCode": 404
                    });
                    next();
                    return
                }

                var map_def = JSON.parse(rv);
                var map_url = req.protocol + '://' + req.get("host") + '/v2/mapping/' + s;

                mapDef(s, map_url, map_def, function(rb) {
                    res.json(rb);
                    next();
                })
            });
        }
    };
};