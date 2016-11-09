"use strict";

var _ = require('lodash');
var should = require('chai').should();  // eslint-disable-line no-unused-vars
var request = require('supertest'),
    app = require('../app.js');

describe('View', function() {
  this.timeout(30000);
  describe('basic', function() {
    it('should accept get', function(done) {
      request(app.server)
        .get("/v2/view/records/0000012b-9bb8-42f4-ad3b-c958cb22ae45")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.uuid.should.equal("0000012b-9bb8-42f4-ad3b-c958cb22ae45");
          done();
        });
    });
    it('should work for recordsets', function(done) {
      request(app.server)
        .get("/v2/view/recordsets/6bb853ab-e8ea-43b1-bd83-47318fc4c345")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.uuid.should.equal("6bb853ab-e8ea-43b1-bd83-47318fc4c345");
          response.body.type.should.equal("recordsets");
          response.body.data.collection_name.should.equal("UF Invertebrate Zoology");
          done();
        });
    });
    it('should work for publishers', function(done) {
      request(app.server)
        .get("/v2/view/publishers/076c0ff6-65e9-48a5-8e4b-2447936f9a1c")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.uuid.should.equal("076c0ff6-65e9-48a5-8e4b-2447936f9a1c");
          response.body.type.should.equal("publishers");
          done();
        });
    });
    _.each(['publishers', 'recordsets', 'records', 'mediarecords'],
           function(t) {
             it('should 404 on missing ' + t, function(done) {
               request(app.server)
                 .get("/v2/view/" + t + "/00000000-0000-0000-0000-000000000000")
                 .expect('Content-Type', /json/)
                 .expect(404)
                 .end(function(error, response) {
                   response.body.error.should.equal("Not Found");
                   done();
                 });
             });
           }
          );
    it('should have media aliased to mediarecords', function(done) {
      request(app.server)
        .get("/v2/view/media/00100314-3220-4107-87f3-43cfdfa0cf10")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          response.body.uuid.should.equal("00100314-3220-4107-87f3-43cfdfa0cf10");
          done();
        });
    });
  });
});
