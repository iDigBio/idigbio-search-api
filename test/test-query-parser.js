"use strict";

var should = require('chai').should();

var app = require('../app.js');
var config = app.config

var queryShim = require("../app/lib/query-shim.js")(app,config);

describe('Query Shim', function(){
    describe('value support', function(){
        it('should support strings', function(done){
            var parsed = queryShim({
                "genus": "acer"
            });
            parsed.query.filtered.filter.and[0].term.should.have.property("genus");
            done();
        });
        it('should lowercase strings', function(done){
            var parsed = queryShim({
                "genus": "Acer"
            });
            parsed.query.filtered.filter.and[0].term.should.have.property("genus");
            parsed.query.filtered.filter.and[0].term.genus.should.equal("acer");
            done();
        });
        it('should support numbers', function(done){
            var parsed = queryShim({
                "version": 2
            });
            parsed.query.filtered.filter.and[0].term.should.have.property("version");
            done();
        });
        it('should support booleans', function(done){
            var parsed = queryShim({
                "hasImage": true
            });
            parsed.query.filtered.filter.and[0].term.should.have.property("hasImage");
            done();
        });
        it('should support lists of strings', function(done){
            var parsed = queryShim({
                "genus": ["acer","quercus"]
            });
            parsed.query.filtered.filter.and[0].terms.should.have.property("genus");
            parsed.query.filtered.filter.and[0].terms.genus.should.be.an.Array;
            parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
            parsed.query.filtered.filter.and[0].terms.genus.should.eql(["acer","quercus"]);
            done();
        });
        it('should lowercase lists of strings', function(done){
            var parsed = queryShim({
                "genus": ["Acer","Quercus"]
            });
            parsed.query.filtered.filter.and[0].terms.should.have.property("genus");
            parsed.query.filtered.filter.and[0].terms.genus.should.be.an.Array;
            parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
            parsed.query.filtered.filter.and[0].terms.genus.should.eql(["acer","quercus"]);
            done();
        });
        it('should support list of numbers', function(done){
            var parsed = queryShim({
                "version": [2,3]
            });
            parsed.query.filtered.filter.and[0].terms.should.have.property("version");
            parsed.query.filtered.filter.and[0].terms.version.should.be.an.Array
            parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
            done();
        });
        it('should support list of booleans', function(done){
            var parsed = queryShim({
                "hasImage": [true,false]
            });
            parsed.query.filtered.filter.and[0].terms.should.have.property("hasImage");
            parsed.query.filtered.filter.and[0].terms.hasImage.should.be.an.Array
            parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
            done();
        });
    });
    describe('type support', function(){
        it('should support exists', function(done){
            var parsed = queryShim({
                "genus": {
                    "type": "exists"
                }
            });
            parsed.query.filtered.filter.and[0].should.have.property("exists");
            done();
        });
        it('should support missing', function(done){
            var parsed = queryShim({
                "genus": {
                    "type": "missing"
                }
            });
            parsed.query.filtered.filter.and[0].should.have.property("missing");
            done();
        });
        it('should support range', function(done){
            var parsed = queryShim({
              "minelevation": {
                "type": "range",
                "gte": "100",
                "lte": "200"
              }
            });
            parsed.query.filtered.filter.and[0].should.have.property("range");
            done();
        });
        it('should support geo_bounding_box', function(done){
            var parsed = queryShim({
              "geopoint": {
                "type": "geo_bounding_box",
                "top_left": {
                  "lat": 19.23,
                  "lon": -130
                },
                "bottom_right": {
                  "lat": -45.1119,
                  "lon": 179.99999
                }
              }
            });
            parsed.query.filtered.filter.and[0].should.have.property("geo_bounding_box");
            done();
        });
        it('should support geo_distance', function(done){
            var parsed = queryShim({
              "geopoint": {
                "type": "geo_distance",
                "distance": "100km",
                "lat": -46.3445,
                "lon": 110.454
            }});
            parsed.query.filtered.filter.and[0].should.have.property("geo_distance");
            done();
        });
        it('should support fulltext', function(done){
            var parsed = queryShim({
              "data": {
                "type": "fulltext",
                "value": "aster"
              }
            });
            parsed.query.filtered.query.match._all.should.have.property("query");
            done();
        });
        it('should support prefix', function(done){
            var parsed = queryShim({
              "family": {
                "type": "prefix",
                "value": "aster"
              }
            });
            parsed.query.filtered.filter.and[0].should.have.property("prefix");
            done();
        });
    });
});