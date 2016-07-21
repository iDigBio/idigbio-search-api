"use strict";

var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('View', function(){
  this.timeout(30000)
  describe('basic', function(){
    it('should accept get', function(done){
      request(app.server)
        .get("/v2/view/records/0000012b-9bb8-42f4-ad3b-c958cb22ae45")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
            response.body.uuid.should.equal("0000012b-9bb8-42f4-ad3b-c958cb22ae45"); 
            done();
        })
    })
    it('should work for publishers', function(done){
      request(app.server)
        .get("/v2/view/publishers/076c0ff6-65e9-48a5-8e4b-2447936f9a1c")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
            response.body.uuid.should.equal("076c0ff6-65e9-48a5-8e4b-2447936f9a1c"); 
            done();
        })
    })    
    it('should 404 on missing record', function(done){
      request(app.server)
        .get("/v2/view/records/00000000-0000-0000-0000-000000000000")
        .expect('Content-Type', /json/)
        .expect(404)
        .end(function(error, response) {
            response.body.error.should.equal("Not Found"); 
            done();
        })
    })
    it('should have media aliased to mediarecords', function(done){
      request(app.server)
        .get("/v2/view/media/00100314-3220-4107-87f3-43cfdfa0cf10")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
            response.body.uuid.should.equal("00100314-3220-4107-87f3-43cfdfa0cf10"); 
            done();
        })
    })    
  })     
})