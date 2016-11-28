/* eslint max-params: "off" */
/* eslint max-statements: "off" */
/* eslint new-cap: "off" */
/* eslint newline-per-chained-call: "off" */
/* eslint no-else-return: "off" */
/* eslint no-empty: "off" */
/* eslint no-inline-comments: "off" */
/* eslint no-plusplus: "off" */
/* eslint no-sync: "off" */
/* eslint radix: "off" */
/* eslint require-jsdoc: "off" */


import _ from 'lodash';
import geohash from "ngeohash";
import Hashids from "hashids";
import chroma from "chroma-js";
import path from "path";
import bluebird from 'bluebird';

import mapnik from "mapnik";
mapnik.Logger.setSeverity(mapnik.Logger.DEBUG);
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins, 'csv.input'));


import config from "config";
import api from "api";
import redisclient from "redisclient";
import searchShim from "searchShim.js";
import mercator from "lib/sphericalmercator";
import hasher from "lib/hasher";
import queryShim from "lib/query-shim.js";
import * as tileMath from "lib/tile-math.js";
import getParam from "lib/get-param.js";
import * as cp from "lib/common-params.js";
import * as formatter from "lib/formatter.js";


const INVERTED = false;
const hashids = new Hashids("idigbio", 8);

function getPointProps(hit) {
  var props = {
    "uuid": hit._id,
  };
  _.keys(hit._source).forEach(function(k) {
    if(k !== "geopoint") {
      props[k] = hit._source[k];
    }
  });
  return props;
}

function getGeohashProps(bucket) {
  var props = {
    "geohash": bucket.key,
    "itemCount": bucket.doc_count,
  };
  return props;
}


async function geoJsonPoints(body) {
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
  rb.attribution = await formatter.attribution(body.aggregations.rs.buckets);
  return rb;
}

async function geoJsonGeohash(body) {
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

  rb.attribution = await formatter.attribution(body.aggregations.rs.buckets);
  return rb;
}

function styleJSON(map_def, body) {
  var rv = {
    "colors": {}
  };
  var order = [];
  var default_color = "black";

  if(map_def.type === "geohash") {
    var max_bucket_value = 1;
    try {
      if(map_def.style.styleOn === "sd.value") {
        var gh_buckets = body.aggregations.ggh.f.gh.buckets;
        // TODO: use _.mapBy
        for(let i = 0; i < gh_buckets.length; i++) {
          if(max_bucket_value < gh_buckets[i].sd.value) {
            max_bucket_value = gh_buckets[i].sd.value;
          }
        }
      } else {
        max_bucket_value = body.aggregations.ggh.f.gh.buckets[0].doc_count;
      }
    } catch (e) {}


    if(_.isArray(map_def.style.scale) && map_def.style.scale.length === 1) {
      default_color = map_def.style.scale[0];
    }

    var dom = [1, max_bucket_value];
    var kls = chroma.limits(dom, 'l', 10);
    var scale = chroma.scale(map_def.style.scale).mode('lab').domain(dom).classes(kls);
    var clrs = scale.colors();

    if(INVERTED) {
      clrs.reverse();
    }

    kls.forEach(function(domain, i) {
      if(i >= clrs.length) {
        i = clrs.length - 1;
      }
      domain = Math.floor(domain);
      var fl = chroma(clrs[i]);
      order.push(domain);
      if(fl) {
        rv["colors"][domain] = {
          "fill": fl.alpha(0.7).css(),
          "stroke": fl.darker(0.2).alpha(0.7).css()
        };
      } else {
        rv["colors"][domain] = {
          "fill": default_color,
          "stroke": default_color
        };
      }
    });
    rv["default"] = {
      "fill": default_color,
      "stroke": default_color
    };
  } else {
    var colorCount = body.aggregations.gstyle.f.style.buckets.length + 1;

    if(_.isArray(map_def.style.pointScale) && map_def.style.pointScale.length === 1) {
      default_color = map_def.style.pointScale[0];
    }

    var scale = chroma.scale(map_def.style.pointScale).domain([0, colorCount], colorCount);
    for(let i = 0; i < body.aggregations.gstyle.f.style.buckets.length; i++) {
      var b = body.aggregations.gstyle.f.style.buckets[i];
      order.push(b.key);
      let fl = scale.mode('lab')(i);
      if(fl) {
        rv["colors"][b.key] = {
          "fill": fl.alpha(0.7).css(),
          "stroke": chroma("black").alpha(0.7).css(),
          "itemCount": b["doc_count"]
        };
      } else {
        fl = chroma(default_color);
        rv["colors"][b.key] = {
          "fill": fl.alpha(0.7).css(),
          "stroke": chroma("black").alpha(0.7).css()
        };
      }
    }
    var fl = scale.mode('lab')(colorCount);
    if(fl) {
      rv["default"] = {
        "fill": fl.alpha(0.7).css(),
        "stroke": chroma("black").alpha(0.7).css()
      };
    } else {
      fl = chroma(default_color);
      rv["default"] = {
        "fill": fl.alpha(0.7).css(),
        "stroke": chroma("black").alpha(0.7).css()
      };
    }
  }
  rv["order"] = order;
  rv["itemCount"] = body.hits.total;

  return rv;
}

var styleOnRule = _.template("<Rule>\n<Filter>[<%= field %>] = '<%= key %>'</Filter>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
var pointElseRule = _.template("<Rule>\n<ElseFilter/>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
var countRule = _.template("<Rule>\n<Filter>[count] &lt;= <%= key %></Filter>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");
var geohashElseRule = _.template("<Rule>\n<ElseFilter/>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");


async function tileGeohash(zoom, x, y, map_def, body, render_type) {
  var map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);
  var sj = styleJSON(map_def, body);
  var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
  s += '  <Style name="style" filter-mode="first">\n';

  sj.order.forEach(function(key) {
    s += countRule({
      key: key,
      fill: sj["colors"][key]["fill"],
      stroke: sj["colors"][key]["stroke"],
    });
  });
  s += geohashElseRule({
    fill: sj["default"]["fill"],
    stroke: sj["default"]["stroke"],
  });
  s += '  </Style>\n';
  s += '</Map>';

  var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
  const bpmfs = bluebird.promisify(map.fromString, {context: map});
  map = await bpmfs(s, {
    strict: true,
    base: './'
  });

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
    if(map_def.style.styleOn === "sd.value") {
      csv_string += bucket.key + "," + bucket.sd.value + ",'" + f.geometry().toJSON({
        transform: trans
      }) + "'\n";
    } else {
      csv_string += bucket.key + "," + bucket.doc_count + ",'" + f.geometry().toJSON({
        transform: trans
      }) + "'\n";
    }
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

  if(render_type === "grid.json") {
    var grid = new mapnik.Grid(map.width, map.height, {key: "id"});
    const bpmr = bluebird.promisify(map.render, {context: map});
    const grid2 = await bpmr(grid, {layer: 0, "fields": ["count"]});
    return grid2.encodeSync({"format": "utf"});
  } else {
    var im = new mapnik.Image(map.width, map.height);
    if(INVERTED) {
      var ks = Object.keys(sj["colors"]);
      ks.sort();
      im.fillSync(new mapnik.Color(sj["colors"][ks[0]]["fill"]));
    }
    const bpmr = bluebird.promisify(map.render, {context: map});
    return (await bpmr(im)).encodeSync('png');
  }
}


async function tilePoints(zoom, x, y, map_def, body, render_type) {
  var map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);
  var sj = styleJSON(map_def, body);
  var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
  s += '  <Style name="style" filter-mode="first">\n';

  sj.order.forEach(function(key) {
    s += styleOnRule({
      field: map_def.style.styleOn,
      key: key,
      fill: sj["colors"][key]["fill"],
      stroke: sj["colors"][key]["stroke"],
    });
  });
  s += pointElseRule({
    fill: sj["default"]["fill"],
    stroke: sj["default"]["stroke"],
  });

  s += '  </Style>\n';
  s += '</Map>';

  var bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
  const bpmfs = bluebird.promisify(map.fromString, {context: map});
  map = await bpmfs(s, {
    strict: true,
    base: './'
    });

  // looks like this isn't used
  // var options = {
  //  extent: '-20037508.342789,-8283343.693883,20037508.342789,18365151.363070'
  // };

  var mem_ds = new mapnik.MemoryDatasource({});
  var proj = new mapnik.Projection('+init=epsg:3857');

  body.hits.hits.forEach(function(hit) {
    var xy = proj.forward([hit._source.geopoint.lon, hit._source.geopoint.lat]);

    var f = {
      'x': xy[0],
      'y': xy[1],
      'properties': {
        'id': hit._id,
        'lat': hit._source.geopoint.lat,
        'lon': hit._source.geopoint.lon
      }
    };
    if(hit._source[map_def.style.styleOn]) {
      f["properties"][map_def.style.styleOn] = hit._source[map_def.style.styleOn];
    } else {
      f["properties"][map_def.style.styleOn] = "";
    }


    mem_ds.add(f);
  });

  var l = new mapnik.Layer('test');
  l.srs = map.srs;
  l.styles = ['style'];
  l.datasource = mem_ds;
  map.add_layer(l);
  map.extent = bbox;
  if(render_type === "grid.json") {
    const grid = new mapnik.Grid(map.width, map.height, {key: "id"});
    const options = {layer: 0, "fields": [map_def.style.styleOn, "lat", "lon"]};
    const bpmr = bluebird.promisify(map.render, {context: map});
    const grid2 = await bpmr(grid, options);
    return grid2.encodeSync({"format": "utf"});
  } else {
    let im = new mapnik.Image(map.width, map.height);
    const bpmr = bluebird.promisify(map.render, {context: map});
    im = await bpmr(im);
    return im.encodeSync('png');
  }
}

function makeKeyDefined(path, wd) {
  path.forEach(function(k) {
    if(!wd[k]) {
      wd[k] = {};
    }
    wd = wd[k];
  });
}


async function mapDef(s, map_url, map_def, stats_info) {
  var query = await queryShim(map_def.rq, "records");

  makeKeyDefined(["query", "filtered", "filter"], query);

  if(!query["query"]["filtered"]["filter"]["and"]) {
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
    },
    "max_dm": {
      "max": {
        "field": "datemodified"
      }
    }
  };
  query["size"] = 0;
  const body = await searchShim(config.search.index, "records", "_search", query, stats_info);
  var rb = {
    shortCode: s,
    tiles: map_url + "/{z}/{x}/{y}.png",
    geojson: map_url + "/{z}/{x}/{y}.json",
    utf8grid: map_url + "/{z}/{x}/{y}.grid.json",
    points: map_url + "/points",
    mapDefinition: map_def,
    itemCount: body.hits.total,
    lastModified: new Date(body.aggregations.max_dm.value)
  };

  rb.attribution = await formatter.attribution(body.aggregations.rs.buckets);
  return rb;
}

async function makeBasicFilter(map_def) {
  var query = await queryShim(map_def.rq);

  makeKeyDefined(["query", "filtered", "filter"], query);

  if(!query["query"]["filtered"]["filter"]["and"]) {
    query["query"]["filtered"]["filter"]["and"] = [];
  }

  query["query"]["filtered"]["filter"]["and"].push({
    "exists": {
      "field": "geopoint",
    }
  });
  return query;
}

async function makeTileQuery(map_def, z, x, y, response_type) {
  var query = await makeBasicFilter(map_def);
  var unboxed_query = _.cloneDeep(query.query);
  var gl = tileMath.zoom_to_geohash_len(z, false);
  var g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
  var padding_size = 3;

  var tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z, x, y);
  query["query"]["filtered"]["filter"]["and"].push({
    "geo_bounding_box": {
      "geopoint": {
        "top_left": {
          "lat": Math.min(tile_bbox[0][0] + (g_bbox_size[0] * padding_size), 89.9999),
          "lon": Math.max(tile_bbox[0][1] - (g_bbox_size[1] * padding_size), -179.9999)
        },
        "bottom_right": {
          "lat": Math.max(tile_bbox[1][0] - (g_bbox_size[0] * padding_size), -89.9999),
          "lon": Math.min(tile_bbox[1][1] + (g_bbox_size[1] * padding_size), 179.9999)
        }
      }
    }
  });

  if(map_def.type === "geohash") {
    query["size"] = 0;
    query["aggs"] = {
      "geohash": {
        "geohash_grid": {
          "field": "geopoint",
          "precision": gl,
          "size": config.maxTileObjects
        },
        "aggs": {
          "sd": {
            "cardinality": {
              "field": "specificepithet"
            }
          }
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
                },
                "aggs": {
                  "sd": {
                    "cardinality": {
                      "field": "specificepithet"
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  } else if(map_def.type === "points") {
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
    };
  }

  if(response_type === "json") {
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

async function getMapDef(ctx) {
  const rv = await redisclient.get(ctx.params.s);
  if(!rv) {
    ctx.throw(404);
  }
  var map_def = JSON.parse(rv);
  var count = 0;
  if(map_def.type === 'auto') {
    var query = await makeBasicFilter(map_def);
    const body  = await searchShim(config.search.index, "records", "_count", query);
    count = body.count;

    if(count > map_def.threshold) {
      map_def.type = "geohash";
    } else {
      map_def.type = "points";
    }
  }
  return map_def;
}

async function makeMapTile(ctx, map_def, count) {
  // var s = ctx.params.s;

  const x = parseInt(ctx.params.x, 10),
        y = parseInt(ctx.params.y, 10),
        z = parseInt(ctx.params.z, 10);

  var response_type = ctx.params.t;
  if(ctx.params.y.slice(-5) === ".grid") {
    response_type = "grid." + response_type;
  }

  var query = await makeTileQuery(map_def, z, x, y, response_type);

  var typeGeohash = async function(body, response_type) {
    ctx.body = await tileGeohash(z, x, y, map_def, body, response_type);
    if(response_type !== "grid.json") {
      ctx.type = 'image/png';
    }
  };

  var typePoints = async function(body, response_type) {
    ctx.body = await tilePoints(z, x, y, map_def, body, response_type);
    if(response_type !== "grid.json") {
      ctx.type = 'image/png';
    }
  };

  const body = await searchShim(config.search.index, "records", "_search", query);
  if(response_type === "json") {
    if(map_def.type === "geohash") {
      ctx.body = await geoJsonGeohash(body);
    } else {
      ctx.body = await geoJsonPoints(body);
    }
  } else if(response_type === "grid.json") {
    if(map_def.type === "geohash") {
      await typeGeohash(body, response_type);
    } else {
      await typePoints(body, response_type);
    }
  } else if(map_def.type === "geohash") {
    await typeGeohash(body);
  } else {
    await typePoints(body);
  }
}

const mapPoints = async function(ctx) {
  try {
    const s = ctx.params.s,
          limit = cp.limit(ctx.request),
          offset = cp.offset(ctx.request),
          sort = cp.sort(ctx.request);

    var lat = getParam(ctx.request, "lat", parseFloat, 0),
        lon = getParam(ctx.request, "lon", parseFloat, 0);
    while(lon > 180) { lon -= 360; }
    while(lon < -180) { lon += 360; }

    const z = getParam(ctx.request, "zoom", parseInt, 0);
    var pdist = 10;  // point layer radius
    // console.log(z);
    var gl = tileMath.zoom_to_geohash_len(z, false);

    var gh = geohash.encode(lat, lon, gl);
    var meta_bbox = geohash.decode_bbox(gh);
    geohash.neighbors(gh).forEach(function(n) {
      var nbb = geohash.decode_bbox(n);
      if(nbb[0] < meta_bbox[0]) {
        meta_bbox[0] = nbb[0];
      }
      if(nbb[1] < meta_bbox[1]) {
        meta_bbox[1] = nbb[1];
      }
      if(nbb[2] > meta_bbox[2]) {
        meta_bbox[2] = nbb[2];
      }
      if(nbb[3] > meta_bbox[3]) {
        meta_bbox[3] = nbb[3];
      }
    });

    const map_def = await getMapDef(ctx);

    var query = await queryShim(map_def.rq);
    var type = map_def.type;

    makeKeyDefined(["query", "filtered", "filter"], query);

    if(!query["query"]["filtered"]["filter"]["and"]) {
      query["query"]["filtered"]["filter"]["and"] = [];
    }
    query["query"]["filtered"]["filter"]["and"].push({
      "exists": {
        "field": "geopoint",
      }
    });
    if(type === 'points') {
      if(z < 4) {
        pdist = 10;
      } else if(z >= 4 && z < 7) {
        pdist = 6;
      } else if(z >= 7 && z < 10) {
        pdist = 3;
      } else if(z >= 10) {
        pdist = 0.25;
      }
      query["query"]["filtered"]["filter"]["and"].push({
        "geo_distance": {
          "geopoint": {
            "lat": lat,
            "lon": lon
          },
          "distance": pdist + "km"
        }
      });
    } else {
      query["query"]["filtered"]["filter"]["and"].push({

        /* "geohash_cell": {
           "geopoint": {
           "lat": lat,
           "lon": lon
           },
           "precision": gl
           }*/
        "geo_bounding_box": {
          "geopoint": {
            "top_left": {
              "lat": meta_bbox[2],
              "lon": meta_bbox[1]
            },
            "bottom_right": {
              "lat": meta_bbox[0],
              "lon": meta_bbox[3]
            }
          }
        }
      });
    }

    query["aggs"] = {
      "rs": {
        "terms": {
          "field": "recordset",
          "size": config.maxRecordsets
        }
      },
      "max_dm": {
        "max": {
          "field": "datemodified"
        }
      }
    };
    query["from"] = offset;
    query["size"] = limit;
    query["sort"] = sort;

    const body = await searchShim(config.search.index, "records", "_search", query);

    let extra = null;
    if(type === 'points') {
      extra = {
        "radius": {
          "lat": lat,
          "lon": lon,
          "distance": pdist
        }
      };
    } else {
      extra = {
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
      };
    }
    ctx.body = await formatter.basic(body, extra);
  } catch (e) {
    console.error("Error constructing mappoints:", e);
    ctx.throw(e, 400);
  }
};

const getMapStyle = async function(ctx) {
  const map_def = await getMapDef(ctx);
  var query = await makeTileQuery(map_def, ctx.params.z, 0, 0);
  const body = await searchShim(config.search.index, "records", "_search", query);
  ctx.body = styleJSON(map_def, body);
};

const getMapTile = async function(ctx) {
  const map_def = await getMapDef(ctx);
  return makeMapTile(ctx, map_def);
};

const createMap = async function(ctx) {
  var rq = cp.query("rq", ctx.request);

  var type = getParam(ctx.request, "type", function(p) {
    if(p === "points") {
      return "points";
    } else if(p === "auto") {
      return "auto";
    } else {
      return "geohash";
    }
  }, "geohash");

  var threshold = getParam(ctx.request, "threshold", p => (_.isFinite(p) ? p : 5000), 5000);
  var default_style = {
    scale: 'YlOrRd',
    pointScale: 'Paired',
    styleOn: "scientificname"
  };

  var style = getParam(ctx.request, "style", function(p) {
    try {
      return JSON.parse(p);
    } catch (e) {
      return p;
    }
  }, default_style);

  _.defaults(style, default_style);

  var map_def = {
    rq: rq,
    type: type,
    style: style,
    threshold: threshold
  };

  var h = hasher("sha1", map_def);

  //const map_exists = await redisclient.exists(h);
  let s = await redisclient.get(h);
  if(s) {
    console.log("Found stored map s:", s);
    // TODO: this gets ignored, why are we fetching it?
    const stored_map_def = await redisclient.get(s);
    // TODO: use named route lookup
    const map_url = 'https://' + ctx.host + '/v2/mapping/' + s;
    ctx.body = await mapDef(s, map_url, map_def, {
      type: "mapping",
      recordtype: "records",
      ip: ctx.ip,
    });
  } else {
    const v = await redisclient.incr("queryid");
    s = hashids.encode(v);
    await redisclient.set(s, JSON.stringify(map_def));
    await redisclient.set(h, s);
    // TODO: use named route lookup
    const map_url = 'https://' + ctx.host + '/v2/mapping/' + s;

    ctx.body = await mapDef(s, map_url, map_def, {
      type: "mapping",
      recordtype: "records",
      ip: ctx.ip,
    });
  }
};

const getMap = async function(ctx) {
  const s = ctx.params.s;
  const rv = await redisclient.get(s);
  if(!rv) {
    ctx.throw("Not Found", 404);
    return;
  }

  const map_def = JSON.parse(rv);
  // TODO: use named route lookup
  const map_url = 'https://' + ctx.host + '/v2/mapping/' + s;
  try {
    ctx.body = await mapDef(s, map_url, map_def, {
      type: "mapping",
      recordtype: "records",
      ip: ctx.ip,
    });
  } catch (e) {
    ctx.throw(e, 400);
  }
};


api.get('/v2/mapping/', createMap);
api.post('/v2/mapping/', createMap);

// TODO: app.use('/v2/mapping/:s', cache.middleware);
api.get('/v2/mapping/:s', getMap);
api.get('/v2/mapping/:s/style/:z', getMapStyle);
api.get('/v2/mapping/:s/points', mapPoints);
api.get('/v2/mapping/:s/:z/:x/:y.:t', getMapTile);
