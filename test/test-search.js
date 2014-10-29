"use strict";

var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('Search', function(){
  this.timeout(30000)
  describe('basicGET', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/search/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
            response.body.itemCount.should.equal(0);
            response.body.items.length.should.equal(0);
            done();
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/search/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.itemCount.should.not.equal(0);
          response.body.items.length.should.not.equal(0);
          done();
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .get("/v2/search/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.items.length.should.be.below(config.maxLimit+1);
          done();
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
          response.body.itemCount.should.equal(0);
          response.body.items.length.should.equal(0);
          done();
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .post("/v2/search/")
        .send({
            rq: q,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.itemCount.should.not.equal(0);
          response.body.items.length.should.not.equal(0);
          done();
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
          response.body.items.length.should.be.below(config.maxLimit+1);
          done();
        })
    }) 
  })
  describe('mediaGET', function(){
    it('should return an empty search for {"scientificname": "nullius nullius"}', function(done){
      var q = {"scientificname": "nullius nullius"}
      request(app.server)
        .get("/v2/media/?rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)        
        .end(function(error, response) {
            response.body.itemCount.should.equal(0);
            response.body.items.length.should.equal(0);
            done();
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .get("/v2/media/?rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.itemCount.should.not.equal(0);
          response.body.items.length.should.not.equal(0);
          done();
        })
    })
    it('should obey maxLimit', function(done){
      var q = {}
      request(app.server)
        .get("/v2/media/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)) + "&mq="  + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)        
        .end(function(error, response) {
          response.body.items.length.should.be.below(config.maxLimit+1);
          done();
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
          response.body.itemCount.should.equal(0);
          response.body.items.length.should.equal(0);
          done();
        })
    })
    it('should not return an empty search for {}', function(done){
      var q = {}
      request(app.server)
        .post("/v2/media/")
        .send({
            rq: q,
            mq: q
        })
        .expect('Content-Type', /json/)
        .expect(200)        
        .end(function(error, response) {
          response.body.itemCount.should.not.equal(0);
          response.body.items.length.should.not.equal(0);
          done();
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
          response.body.items.length.should.be.below(config.maxLimit+1);
          done();
        })
    })             
  })      
})