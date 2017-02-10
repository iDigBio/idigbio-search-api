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
import { memoize } from 'lodash/function';
import geohash from "ngeohash";
import Hashids from "hashids";
import chroma from "chroma-js";
import path from "path";
import {fromCallback} from "bluebird";
import createError from "http-errors";


import mapnik from "mapnik";
mapnik.Logger.setSeverity(mapnik.Logger.DEBUG);
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins, 'csv.input'));


import config from "config";
import logger from "logging";
import cache from "cache";
import api from "api";
import redisclient from "redisclient";
import searchShim from "searchShim.js";
import {ParameterParseError} from "lib/exceptions";
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
  return {
    "geohash": bucket.key,
    "itemCount": bucket.doc_count,
  };
}

async function geoJsonPoints(body) {
  const features = _.map(body.hits.hits, function(hit) {
    return {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [hit._source.geopoint.lon, hit._source.geopoint.lat]
      },
      "properties": getPointProps(hit)
    };
  });
  return {
    "itemCount": body.hits.total,
    "type": "FeatureCollection",
    "features": features,
    "attribution": await formatter.attribution(body.aggregations.rs.buckets)
  };
}

async function geoJsonGeohash(body) {
  const features = _.map(body.aggregations.geohash.buckets, function(bucket) {
    const gh_bbox = geohash.decode_bbox(bucket.key),
          poly = [
            [gh_bbox[1], gh_bbox[0]],
            [gh_bbox[3], gh_bbox[0]],
            [gh_bbox[3], gh_bbox[2]],
            [gh_bbox[1], gh_bbox[2]],
            [gh_bbox[1], gh_bbox[0]],
          ];
    return {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [poly]
      },
      "properties": getGeohashProps(bucket)
    };
  });
  return {
    "itemCount": body.hits.total,
    "type": "FeatureCollection",
    "features": features,
    "attribution": await formatter.attribution(body.aggregations.rs.buckets)
  };
}

function styleJSONGeohash(map_def, body) {
  let default_color = "black";
  let max_bucket_value = 1;
  try {
    if(map_def.style.styleOn === "sd.value") {
      const gh_buckets = body.aggregations.ggh.f.gh.buckets;
      max_bucket_value = _(gh_buckets).map((ghb) => ghb.sd.value).max();
    } else {
      max_bucket_value = body.aggregations.ggh.f.gh.buckets[0].doc_count;
    }
  } catch (e) {}

  if(_.isArray(map_def.style.scale) && map_def.style.scale.length === 1) {
    default_color = map_def.style.scale[0];
  }

  const dom = [1, max_bucket_value];
  const kls = chroma.limits(dom, 'l', 10);  // l is undocumented for `log`
  const scale = chroma.scale(map_def.style.scale).mode('lab').domain(dom).classes(kls);
  const clrs = scale.colors();

  if(INVERTED) {
    clrs.reverse();
  }
  const colors = {};
  const order = _.map(kls, function(domain, i) {
    domain = Math.floor(domain);
    const fl = chroma(clrs[Math.min(i, clrs.length - 1)]);
    if(fl) {
      colors[domain] = {
        "fill": fl.alpha(0.7).css(),
        "stroke": fl.darker(0.2).alpha(0.7).css()
      };
    } else {
      colors[domain] = {
        "fill": default_color,
        "stroke": default_color
      };
    }
    return domain;
  });
  return {
    "colors": colors,
    "itemCount": body.hits.total,
    "order": order,
    "default": {
      "fill": default_color,
      "stroke": default_color
    }
  };
}

function styleJSONPoints(map_def, body) {
  const styleBuckets = body.aggregations.gstyle.f.style.buckets,
        style = map_def.style,
        alpha = style.alpha || 1.0,
        pointScale = style.pointScale,
        stroke = chroma(style.stroke || "black").alpha(alpha).css(),
        palette = _.isArray(pointScale) ? pointScale : chroma.brewer[pointScale];
  let fill = style.fill ? chroma(style.fill).alpha(alpha).css() : null;
  if(!palette && !fill) {
    throw new Error("Unknown pointScale definition: " + pointScale);
  }
  const colors = {};
  const order = _.map(styleBuckets, function(b, i) {
    colors[b.key] = {
      "fill": fill || chroma(palette[_.clamp(i, 0, palette.length - 1)]).alpha(alpha).css(),
      "stroke": stroke,
      "itemCount": b["doc_count"]
    };
    return b.key;
  });
  fill = fill || chroma(_.last(palette)).alpha(alpha).css();
  return {
    "colors": colors,
    "default": { fill, stroke },
    "order": order,
    "itemCount": body.hits.total
  };
}

function styleJSON(map_def, body) {
  if(map_def.type === "geohash") {
    return styleJSONGeohash(map_def, body);
  } else {
    return styleJSONPoints(map_def, body);
  }
}

const styleOnRule = _.template("<Rule>\n<Filter>[<%= field %>] = '<%= key %>'</Filter>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
const pointElseRule = _.template("<Rule>\n<ElseFilter/>\n<MarkersSymbolizer marker-type=\"ellipse\" fill=\"<%= fill %>\" stroke=\"<%= stroke %>\" stroke-width=\".5\" width=\"7\" allow-overlap=\"true\" placement=\"point\"/>\n</Rule>\n");
const countRule = _.template("<Rule>\n<Filter>[count] &lt;= <%= key %></Filter>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");
const geohashElseRule = _.template("<Rule>\n<ElseFilter/>\n<PolygonSymbolizer fill=\"<%= fill %>\" clip=\"true\" />\n<LineSymbolizer stroke=\"<%= stroke %>\" stroke-width=\".5\" clip=\"true\" />\n</Rule>\n");


async function tileGeohash(zoom, x, y, map_def, body, render_type) {
  var map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);
  var sj = styleJSON(map_def, body);
  var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
  s += '  <Style name="style" filter-mode="first">\n';
  s += _(sj.order)
    .map((key) => { const {fill, stroke} =  sj["colors"][key]; return {key, fill, stroke}; })
    .map(countRule)
    .join("");
  s += geohashElseRule({
    fill: sj["default"]["fill"],
    stroke: sj["default"]["stroke"],
  });
  s += '  </Style>\n';
  s += '</Map>';

  const bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
  const parseOpts = { strict: true, base: './' };
  map = await fromCallback((cb) => map.fromString(s, parseOpts, cb));

  var csv_string = "id,count,geojson\n";
  const proj = new mapnik.Projection('+init=epsg:3857'),
        wgs84 = new mapnik.Projection('+init=epsg:4326'),
        trans = {transform: new mapnik.ProjTransform(wgs84, proj)};

  csv_string += _(body.aggregations.geohash.buckets)
    .map(function(bucket) {
      var gh_bbox = geohash.decode_bbox(bucket.key);
      var poly = [
        [gh_bbox[1], gh_bbox[0]],
        [gh_bbox[3], gh_bbox[0]],
        [gh_bbox[3], gh_bbox[2]],
        [gh_bbox[1], gh_bbox[2]],
        [gh_bbox[1], gh_bbox[0]],
      ];
      const feat = new mapnik.Feature.fromJSON(JSON.stringify({
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [poly]
        },
        "properties": getGeohashProps(bucket)
      }));
      const val = map_def.style.styleOn === "sd.value" ? bucket.sd.value : bucket.doc_count;
      return bucket.key + "," + val + ",'" + feat.geometry().toJSON(trans) + "'\n";
    })
    .join("");

  const l = new mapnik.Layer('test');
  l.srs = map.srs;
  l.styles = ['style'];
  l.datasource = new mapnik.Datasource({
    type: 'csv',
    'inline': csv_string
  });
  map.add_layer(l);
  map.extent = bbox;

  if(render_type === "grid.json") {
    const grid = new mapnik.Grid(map.width, map.height, {key: "id"});
    const mapOpts = {layer: 0, "fields": ["count"]};
    const grid2 = await fromCallback((cb) => map.render(grid, mapOpts, cb));
    return await fromCallback((cb) => grid2.encode({"format": "utf"}, cb));
  } else {
    let image = new mapnik.Image(map.width, map.height);
    if(INVERTED) {
      const ks = Object.keys(sj["colors"]);
      ks.sort();
      image.fillSync(new mapnik.Color(sj["colors"][ks[0]]["fill"]));
    }
    image = await fromCallback((cb) => map.render(image, cb));
    return await fromCallback((cb) => image.encode("png", cb));
  }
}


async function tilePoints(zoom, x, y, map_def, body, render_type) {
  let map = new mapnik.Map(tileMath.TILE_SIZE, tileMath.TILE_SIZE);
  const sj = styleJSON(map_def, body);
  const styleOn = map_def.style.styleOn;
  var s = '<Map srs="' + mercator.proj4 + '" buffer-size="128">\n';
  s += '  <Style name="style" filter-mode="first">\n';

  s += _(sj.order)
    .map((key) => styleOnRule({
      field: styleOn,
      key: key,
      fill: sj["colors"][key]["fill"],
      stroke: sj["colors"][key]["stroke"],
    }))
    .join("");
  s += pointElseRule(sj["default"]);
  s += '  </Style>\n';
  s += '</Map>';

  const bbox = mercator.xyz_to_envelope(parseInt(x), parseInt(y), parseInt(zoom), false);
  const mapOpts = {
    strict: true,
    base: './'
  };
  map = await fromCallback((cb) => map.fromString(s, mapOpts, cb));

  // looks like this isn't used
  // var options = {
  //  extent: '-20037508.342789,-8283343.693883,20037508.342789,18365151.363070'
  // };

  var mem_ds = new mapnik.MemoryDatasource({});
  var proj = new mapnik.Projection('+init=epsg:3857');

  _.forEach(body.hits.hits, function(hit) {
    const xy = proj.forward([hit._source.geopoint.lon, hit._source.geopoint.lat]);
    const f = {
      'x': xy[0],
      'y': xy[1],
      'properties': {
        'id': hit._id,
        'lat': hit._source.geopoint.lat,
        'lon': hit._source.geopoint.lon
      }
    };
    f["properties"][styleOn] = hit._source[styleOn] || "";
    mem_ds.add(f);
  });

  const l = new mapnik.Layer('test');
  l.srs = map.srs;
  l.styles = ['style'];
  l.datasource = mem_ds;
  map.add_layer(l);
  map.extent = bbox;
  if(render_type === "grid.json") {
    const grid = new mapnik.Grid(map.width, map.height, {key: "id"});
    const options = {layer: 0, "fields": [styleOn, "lat", "lon"]};
    const grid2 = await fromCallback((cb) => map.render(grid, options, cb));
    return await fromCallback((cb) => grid2.encode({"format": "utf"}, cb));
  } else {
    let image = new mapnik.Image(map.width, map.height);
    image = await fromCallback((cb) => map.render(image, cb));
    return await fromCallback((cb) => image.encode('png', cb));
  }
}

function makeBasicFilter(map_def, termType) {
  var query = queryShim(map_def.rq, termType);
  _.update(query, "query.filtered.filter.and", function(v) {
    if(_.isUndefined(v)) { v = []; }
    v.push({ "exists": {"field": "geopoint"}});
    return v;
  });
  return query;
}


function makeTileQuery(map_def, z, x, y, response_type) {
  const query = makeBasicFilter(map_def);
  const unboxed_query = _.cloneDeep(query.query);
  const gl = tileMath.zoom_to_geohash_len(z, false);
  const g_bbox_size = tileMath.geohash_len_to_bbox_size(gl);
  const padding_size = 3;
  const tile_bbox = tileMath.zoom_xy_to_nw_se_bbox(z, x, y);
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
                  "size": map_def.style.styleBuckets
                }
              }
            }
          }
        }
      }
    };
  }

  if(response_type === "json") {
    _.set(query, "aggs.rs", {
      "terms": {
        "field": "recordset",
        "size": config.maxRecordsets
      }
    });
  }

  return query;
}

const resolveAutoType = async function(shortCode, map_def) {
  const key = `resolveAutoType:${shortCode}`;
  return cache.wrap(key, async function() {
    logger.debug("Figuring out map type for auto map %s", shortCode);
    const query = makeBasicFilter(map_def);
    const body = await searchShim(config.search.index, "records", "_count", query);
    return body.count > map_def.threshold ? "geohash" : "points";
  });
};

const lookupShortCode  = memoize(async function(shortCode) {
  const rv = await redisclient.get(shortCode);
  if(!rv) {
    logger.error('Missing shortCode %s', shortCode);
    throw new createError.NotFound();
  }
  return JSON.parse(rv);
});

async function getMapDef(shortCode, opts = {resolveAutoType: true}) {
  let map_def = await lookupShortCode(shortCode);
  map_def.style = _.defaults(map_def.style, config.defaultStyle);
  if(map_def.type === 'auto' && opts.resolveAutoType) {
    map_def = _.clone(map_def);
    map_def.type = await resolveAutoType(shortCode, map_def);
  }
  return map_def;
}

const makeMapTile = async function(map_def, zoom, x, y, response_type) {
  const query = makeTileQuery(map_def, zoom, x, y, response_type);
  const body = await searchShim(config.search.index, "records", "_search", query);

  if(response_type === "json") {
    return await (map_def.type === "geohash" ? geoJsonGeohash(body) : geoJsonPoints(body));
  } else {
    const tileFn = map_def.type === "geohash" ? tileGeohash : tilePoints;
    return await tileFn(zoom, x, y, map_def, body, response_type);
  }
};


const getMapTile = async function(ctx) {
  const map_def = await getMapDef(ctx.params.shortCode);
  const x = parseInt(ctx.params.x, 10),
        y = parseInt(ctx.params.y, 10),
        z = parseInt(ctx.params.z, 10);
  var response_type = ctx.params.t;
  if(response_type  !== "json") {
    ctx.type = 'image/png';
  }
  if(ctx.params.y.slice(-5) === ".grid") {
    response_type = "grid." + response_type;
  }
  ctx.cacheControl = {maxAge: 3600};
  ctx.body = await makeMapTile(map_def, z, x, y, response_type);
};

const mapPoints = async function(ctx) {
  try {
    const limit = cp.limit(ctx.request),
          offset = cp.offset(ctx.request),
          sort = cp.sort(ctx.request),
          lat = cp.lat(ctx.request),
          lon = cp.lon(ctx.request),
          z = cp.zoom(ctx.request);
    const gl = tileMath.zoom_to_geohash_len(z, false);
    const gh = geohash.encode(lat, lon, gl);
    const meta_bbox = geohash.decode_bbox(gh);
    _.forEach(geohash.neighbors(gh), function(n) {
      const nbb = geohash.decode_bbox(n);
      if(nbb[0] < meta_bbox[0]) { meta_bbox[0] = nbb[0]; }
      if(nbb[1] < meta_bbox[1]) { meta_bbox[1] = nbb[1]; }
      if(nbb[2] > meta_bbox[2]) { meta_bbox[2] = nbb[2]; }
      if(nbb[3] > meta_bbox[3]) { meta_bbox[3] = nbb[3]; }
    });

    const map_def = await getMapDef(ctx.params.shortCode);
    const query = makeBasicFilter(map_def);
    query["from"] = offset;
    query["size"] = limit;
    query["sort"] = sort;

    let pdist = 10;  // point layer radius
    if(map_def.type === 'points') {
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

    const body = await searchShim(config.search.index, "records", "_search", query);

    let extra = null;
    if(map_def.type === 'points') {
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
    logger.error("Error constructing mappoints:", e);
    ctx.throw(e, 400);
  }
};

const getMapStyle = async function(ctx) {
  const map_def = await getMapDef(ctx.params.shortCode);
  const query = makeTileQuery(map_def, ctx.params.z, 0, 0);
  const body = await searchShim(config.search.index, "records", "_search", query);
  ctx.body = styleJSON(map_def, body);
};


const getMap = async function(ctx) {
  const shortCode = ctx.params.shortCode;
  const map_def = await getMapDef(shortCode, {resolveAutoType: false});
  const map_url = ctx.origin + '/v2/mapping/' + shortCode;
  const query = makeBasicFilter(map_def, "records");
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
    },
    "max_lat": {
      "max": {
        "field": "geopoint.lat"
      }
    },
    "max_lon": {
      "max": {
        "field": "geopoint.lon"
      }
    },
    "min_lat": {
      "min": {
        "field": "geopoint.lat"
      }
    },
    "min_lon": {
      "min": {
        "field": "geopoint.lon"
      }
    }
  };
  query["size"] = 0;
  const stats_info = {
    type: "mapping",
    recordtype: "records",
    ip: ctx.ip,
  };
  const body = await searchShim(config.search.index, "records", "_search", query, stats_info);
  const attribution = await formatter.attribution(body.aggregations.rs.buckets);
  ctx.body = {
    shortCode: shortCode,
    tiles: map_url + "/{z}/{x}/{y}.png",
    geojson: map_url + "/{z}/{x}/{y}.json",
    utf8grid: map_url + "/{z}/{x}/{y}.grid.json",
    points: map_url + "/points",
    mapDefinition: map_def,
    itemCount: body.hits.total,
    boundingBox: {
      "top_left": {
        "lat": body.aggregations.min_lat.value,
        "lon": body.aggregations.max_lon.value,
      },
      "bottom_right": {
        "lat": body.aggregations.max_lat.value,
        "lon": body.aggregations.min_lon.value
      }
    },
    lastModified: new Date(body.aggregations.max_dm.value),
    attribution: attribution
  };
};

const MAP_TYPES = ['points', 'auto', 'geohash'];
const getTypeParam = (req) => getParam(req, "type", function(type) {
  if(!_.includes(MAP_TYPES, type)) {
    throw new ParameterParseError(
      `Illegal map type '${type}', must be one of {${MAP_TYPES}}`, 'type');
  }
  return type;
}, "geohash");

const getStyleParam = (req) => _.defaults(
  getParam(req, "style", function(p) {
    if(_.isString(p)) {
      try {
        p = JSON.parse(p);
      } catch (e) {
        throw new ParameterParseError("Invalid style", "style");
      }
    }
    logger.info("style.pointScale", p);
    if(_.isString(p.pointScale) && _.isUndefined(chroma.brewer[p.pointScale])) {
      throw new ParameterParseError("Unknown style.pointScale", "style");
    }
    return p;
  }),
  config.defaultStyle
);

const createMap = async function(ctx) {
  const map_def = {
    rq: cp.query("rq", ctx.request),
    type: getTypeParam(ctx.request),
    style: getStyleParam(ctx.request),
    threshold: cp.threshold(ctx.request, 5000)
  };
  const queryHash = hasher("sha1", map_def);
  let shortCode = await redisclient.get(queryHash);
  if(shortCode) {
    logger.debug("Found stored map: %s", shortCode);
  } else {
    shortCode = hashids.encode(await redisclient.incr("queryid"));
    await Promise.all([
      redisclient.set(shortCode, JSON.stringify(map_def)),
      redisclient.set(queryHash, shortCode)
    ]);
  }
  ctx.params.shortCode = shortCode;
  return getMap(ctx);
};


api.get('/v2/mapping', createMap);
api.post('/v2/mapping', createMap);

api.get('/v2/mapping/:shortCode', getMap);
api.get('/v2/mapping/:shortCode/style/:z', getMapStyle);
api.get('/v2/mapping/:shortCode/points', mapPoints);
api.get('/v2/mapping/:shortCode/:z/:x/:y.:t', getMapTile);
