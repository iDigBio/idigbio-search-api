/* eslint require-jsdoc: "off" */
import {decode, decode_bbox} from "ngeohash";


export var TILE_SIZE = 256;
var BITS_PER_CHAR = 5;

export function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function rad2deg(rad) {
  return rad * (180 / Math.PI);
}

export function sinh(arg) {
  return (Math.exp(arg) - Math.exp(-arg)) / 2;
}

export function asinh(arg) {
  return Math.log(arg + Math.sqrt(arg * arg + 1));
}

export function tile2lat(y, zoom) {
  var n = Math.PI - ((2.0 * Math.PI * y) / Math.pow(2, zoom));
  return rad2deg(Math.atan(sinh(n)));
}

export function tile2lon(x, zoom) {
  return ((x / Math.pow(2, zoom)) * 360.0) - 180.0;
}

export function lon2xpixel(lon, zoom) {
  var lonRad = deg2rad(lon);
  return Math.floor((((1 + (lonRad / Math.PI)) / 2) * Math.pow(2, zoom)) * TILE_SIZE);
}

export function lon2xtile(lon, zoom) {
  var lonRad = deg2rad(lon);
  return Math.floor(((1 + (lonRad / Math.PI)) / 2) * Math.pow(2, zoom));
}

export function lat2ypixel(lat, zoom) {
  lat = deg2rad(lat);
  var latRad = asinh(Math.tan(lat));
  return Math.floor((((1 - (latRad / Math.PI)) / 2) * Math.pow(2, zoom)) * TILE_SIZE);
}

export function lat2ytile(lat, zoom) {
  lat = deg2rad(lat);
  var latRad = asinh(Math.tan(lat));
  return Math.floor(((1 - (latRad / Math.PI)) / 2) * Math.pow(2, zoom));
}

export function zoom_to_geohash_len(zoom, floor) {
  if(zoom == 0) {
    zoom = 1;
  }
  var pixles = Math.pow(2, zoom - 1) * TILE_SIZE;
  var bits = Math.log(pixles, 2) * 2;
  if(floor) {
    return Math.floor(bits / BITS_PER_CHAR);
  } else {
    return Math.ceil(bits / BITS_PER_CHAR);
  }
}

export function geohash_len_to_bbox_size(gl) {
  var latbits = Math.floor((gl * BITS_PER_CHAR) / 2);
  var lonbits = Math.ceil((gl * BITS_PER_CHAR) / 2);

  return [180 / Math.pow(2, latbits), 360 / Math.pow(2, lonbits)];
}

export function zoom_xy_to_nw_se_bbox(zoom, x, y) {
  var bb = [[tile2lat(y, zoom), tile2lon(x, zoom)], [tile2lat(y + 1, zoom), tile2lon(x + 1, zoom)]];
  return bb;
}

export function lat_lon_zoom_to_xy_tile_pixels_mercator(lat, lon, zoom) {
  var xtile = lon2xtile(lon, zoom);
  var ytile = lat2ytile(lat, zoom);

  var xpixel = lon2xpixel(lon, zoom) % TILE_SIZE;
  var ypixel = lat2ypixel(lat, zoom) % TILE_SIZE;

  return [[xtile, ytile], [xpixel, ypixel]];
}

export function geohash_zoom_to_xy_tile_pixels_mercator(ghash, zoom) {
  var gl = zoom_to_geohash_len(zoom, false);
  if(ghash.length > gl) {
    ghash = ghash.substr(0, gl);
  }

  var lat_lon = decode(ghash);

  return lat_lon_zoom_to_xy_tile_pixels_mercator(lat_lon.latitude, lat_lon.longitude, zoom);
}

export function geohash_zoom_to_xy_tile_pixels_mercator_bbox(ghash, zoom) {
  var gl = zoom_to_geohash_len(zoom, false);
  if(ghash.length > gl) {
    ghash = ghash.substr(0, gl);
  }

  var lat_lon_bbox = decode_bbox(ghash);

  // 0 = minlat, 1 = minlon, 2 = maxlat, 3 = maxlon
  // nw = maxlat,minlon = 2,1
  // se = minlat,maxlon = 0,3

  var ttpp_nw = lat_lon_zoom_to_xy_tile_pixels_mercator(lat_lon_bbox[2], lat_lon_bbox[1], zoom);
  var ttpp_se = lat_lon_zoom_to_xy_tile_pixels_mercator(lat_lon_bbox[0], lat_lon_bbox[3], zoom);

  return [
    ttpp_nw,
    ttpp_se
  ];

}

export function project_ttpp_to_current_tile_pixels(ttpp, x, y) {
  return [
    ttpp[1][0] + (ttpp[0][0] - x) * TILE_SIZE,
    ttpp[1][1] + (ttpp[0][1] - y) * TILE_SIZE
  ];
}
