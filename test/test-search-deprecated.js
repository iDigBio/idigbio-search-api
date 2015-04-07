"use strict";

var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('Search Deprecated Endpoints', function(){
  this.timeout(30000)
  describe('basicGET', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/search/?rq=" + encodeURIComponent(JSON.stringify(q)))
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
        .get("/v2/search/?limit=10&rq=" + encodeURIComponent(JSON.stringify(q)))
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
    it('should be able to return a limited set of fields', function(done){
      var q = {"scientificname": {"type": "exists"},"genus": "carex"}
      request(app.server)
        .get("/v2/search/?limit=10&fields=[\"scientificname\"]&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items[0].indexTerms.should.have.property["scientificname"];
            Object.keys(response.body.items[0].indexTerms).length.should.equal(1);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .get("/v2/search/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    })
  })
  describe('basicPOST', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .post("/v2/search/")
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
            response.body.items.length.should.equal(0);
            done();
          }
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .post("/v2/search/")
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
            response.body.items.length.should.not.equal(0);
            done();
          }
        })
    })
    it('should be able to return a limited set of fields', function(done){
      var q = {"scientificname": {"type": "exists"},"genus": "carex"}
      request(app.server)
        .post("/v2/search/")
        .send({
            rq: q,
            limit: 10,
            fields: ["scientificname"]
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items[0].indexTerms.should.have.property["scientificname"];
            Object.keys(response.body.items[0].indexTerms).length.should.equal(1);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .post("/v2/search/")
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
            response.body.items.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    })
    it('should support multiple field sorting with an array', function(done){
      var q = {"family":"asteraceae"}, s = [{"genus":"desc"},{"specificepithet":"asc"}];
      request(app.server)
        .post("/v2/search/")
        .send({
            rq: q,
            sort: s,
            limit: 10,
        })
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
    });
    it('should support sorting with a single field name string', function(done){
      var q = {"family":"asteraceae"}, s = "genus";
      request(app.server)
        .post("/v2/search/")
        .send({
            rq: q,
            sort: s,
            limit: 10,
        })
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
    });
  })

  describe('mediaGET', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/media/?rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
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
        .get("/v2/media/?limit=10&rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
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
    it('should be able to return a limited set of fields', function(done){
      var q = { "data.ac:accessURI": {"type": "exists"} }
      request(app.server)
        .get("/v2/media/?limit=10&fields=[\"data.ac:accessURI\"]&mq="  + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items[0].data.should.have.property["ac:accessURI"];
            Object.keys(response.body.items[0].data).length.should.equal(1);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .get("/v2/media/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    })
  })
  describe('mediaPOST', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .post("/v2/media/")
        .send({
            rq: q,
            mq: q
        })
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
        .post("/v2/media/")
        .send({
            rq: q,
            mq: q,
            limit: 10,
        })
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
    it('should be able to return a limited set of fields', function(done){
      var q = { "data.ac:accessURI": {"type": "exists"} }
      request(app.server)
        .post("/v2/media/")
        .send({
            mq: q,
            limit: 10,
            fields: ["data.ac:accessURI"]
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items[0].data.should.have.property["ac:accessURI"];
            Object.keys(response.body.items[0].data).length.should.equal(1);
            done();
          }
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .post("/v2/media/")
        .send({
            rq: q,
            mq: q,
            limit: 10000,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.items.length.should.be.below(config.maxLimit+1);
            done();
          }
        })
    })
  })
})