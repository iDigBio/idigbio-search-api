"use strict";

var geohash = require('ngeohash');

//module.exports = function(app,config) {
module.exports = function() {
    var TILE_SIZE=256;

    function deg2rad(deg){
        return deg * (Math.PI/180);
    }

    function rad2deg(rad){
        return rad * (180/Math.PI);
    }

    function sinh(arg) {
        return (Math.exp(arg) - Math.exp(-arg)) / 2;
    }

    function asinh(arg) {
        return Math.log(arg + Math.sqrt(arg * arg + 1));
    }

    function tile2lat(y,zoom) {
        var n = Math.PI - ((2.0 * Math.PI * y) / Math.pow(2,zoom));
        return rad2deg(Math.atan(sinh(n)));
    }

    function tile2lon(x,zoom) {
        return ((x / Math.pow(2,zoom)) * 360.0) - 180.0;
    }

    function lon2xpixel(lon,zoom) {
        var lonRad = deg2rad(lon);
        return Math.floor((((1+(lonRad/Math.PI)) / 2) * Math.pow(2,zoom)) * TILE_SIZE);
    }

    function lon2xtile(lon,zoom) {
        var lonRad = deg2rad(lon);
        return Math.floor(((1+(lonRad/Math.PI)) / 2) * Math.pow(2,zoom));
    }

    function lat2ypixel(lat,zoom) {
        lat = deg2rad(lat);
        var latRad = asinh(Math.tan(lat));
        return Math.floor((((1-(latRad/Math.PI)) / 2) * Math.pow(2,zoom)) * TILE_SIZE);
    }

    function lat2ytile(lat,zoom) {
        lat = deg2rad(lat);
        var latRad = asinh(Math.tan(lat));
        return Math.floor(((1-(latRad/Math.PI)) / 2) * Math.pow(2,zoom));
    }

    function zoom_to_geohash_len(zoom,floor){
        var pixles = Math.pow(2,zoom-1)*TILE_SIZE;
        var bits = Math.log(pixles,2)*2;
        if (floor) {
            return Math.floor(bits/5);
        } else {
            return Math.ceil(bits/5);
        }
    }

    function geohash_len_to_bbox_size(gl){
        var latbits = Math.floor((gl*5)/2);
        var lonbits = Math.ceil((gl*5)/2);

        return [180/Math.pow(2,latbits),360/Math.pow(2,lonbits)];
    }

    function zoom_xy_to_nw_se_bbox(zoom,x,y) {
        var bb = [[tile2lat(y,zoom),tile2lon(x,zoom)],[tile2lat(y+1,zoom),tile2lon(x+1,zoom)]];
        return bb;
    }

    function geohash_zoom_to_xy_tile_pixels_mercator(ghash,zoom){
        var gl = zoom_to_geohash_len(zoom,false);
        if (ghash.length > gl) {
            ghash = ghash.substr(0,gl);
        }

        var lat_lon = geohash.decode(ghash);

        var xtile = lon2xtile(lat_lon.longitude,zoom);
        var ytile = lat2ytile(lat_lon.latitude,zoom);

        var xpixel = lon2xpixel(lat_lon.longitude,zoom) % TILE_SIZE;
        var ypixel = lat2ypixel(lat_lon.latitude,zoom) % TILE_SIZE;

        return [[xtile,ytile],[xpixel,ypixel]];
    }

    function geohash_zoom_to_xy_tile_pixels_mercator_bbox(ghash,zoom){
        var gl = zoom_to_geohash_len(zoom,false);
        if (ghash.length > gl) {
            ghash = ghash.substr(0,gl);
        }

        var lat_lon_bbox = geohash.decode_bbox(ghash);

        // 0 = minlat, 1 = minlon, 2 = maxlat, 3 = maxlon
        // nw = maxlat,minlon = 2,1
        // se = minlat,maxlon = 0,3

        var lat_lon_nw = [lat_lon_bbox[2], lat_lon_bbox[1]];
        var lat_lon_se = [lat_lon_bbox[0], lat_lon_bbox[3]];

        return [
            [
                // NW XY Tile
                [
                    lon2xtile(lat_lon_nw[1],zoom),
                    lat2ytile(lat_lon_nw[0],zoom)
                ],
                // NW XY Pixel
                [
                    lon2xpixel(lat_lon_nw[1],zoom) % TILE_SIZE,
                    lat2ypixel(lat_lon_nw[0],zoom) % TILE_SIZE
                ]
            ],
            [
                // SE XY Tile
                [
                    lon2xtile(lat_lon_se[1],zoom),
                    lat2ytile(lat_lon_se[0],zoom)
                ],
                // SE XY Pixel
                [
                    lon2xpixel(lat_lon_se[1],zoom) % TILE_SIZE,
                    lat2ypixel(lat_lon_se[0],zoom) % TILE_SIZE
                ]
            ]
        ];

    }

    var mod = {
        TILE_SIZE: TILE_SIZE,
        deg2rad: deg2rad,
        rad2deg: rad2deg,
        sinh: sinh,
        asinh: asinh,
        tile2lat: tile2lat,
        tile2lon: tile2lon,
        lon2xpixel: lon2xpixel,
        lon2xtile: lon2xtile,
        lat2ypixel: lat2ypixel,
        lat2ytile : lat2ytile ,
        geohash_len_to_bbox_size: geohash_len_to_bbox_size,
        zoom_to_geohash_len: zoom_to_geohash_len,
        zoom_xy_to_nw_se_bbox: zoom_xy_to_nw_se_bbox,
        geohash_zoom_to_xy_tile_pixels_mercator: geohash_zoom_to_xy_tile_pixels_mercator,
        geohash_zoom_to_xy_tile_pixels_mercator_bbox: geohash_zoom_to_xy_tile_pixels_mercator_bbox,
    };

    return mod;
};