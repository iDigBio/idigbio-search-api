"use strict";

var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('Mapping', function(){
  this.timeout(30000)
  describe('basic get points', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {          
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/points/?limit=10&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/points/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.features.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    })          
  })
  describe('basic post points', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .post("/v2/mapping/points/")
        .send({
            rq: q,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .post("/v2/mapping/points/")
        .send({
            rq: q,
            limit: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .post("/v2/mapping/points/")
        .send({
            rq: q,
            limit: 10000,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.features.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    }) 
  })
  describe('basic get geohash', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })          
  })
  describe('basic post geohash', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .post("/v2/mapping/geohash/")
        .send({
            rq: q,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .post("/v2/mapping/geohash/")
        .send({
            rq: q,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })
  })
  describe('tile get points', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mapping/points/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/points/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
              done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })          
  })
  describe('tile get geohash', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mapping/geohash/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/geohash/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.type.should.equal("FeatureCollection");
            response.body.features.length.should.not.equal(0);
            done();
          }
        })
    })          
  })
  describe('tile get png', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mapping/tile/1/0/0.png?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /png/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.length.should.not.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mapping/tile/1/0/0.png?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /png/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.length.should.not.equal(0);
            done();
          }
        })
    })          
  })
  describe('get mappoints', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/mappoints/?lat=0&lon=0&zoom=1&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.equal(0);
            response.body.items.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/mappoints/?lat=0&lon=0&zoom=1&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.itemCount.should.not.equal(0);
            response.body.items.length.should.not.equal(0);
            done();
          }
        })
    })          
  })
})