var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('View', function(){
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
  })     
})