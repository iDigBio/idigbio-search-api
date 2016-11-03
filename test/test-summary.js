"use strict";

var should = require('chai').should();  // eslint-disable-line no-unused-vars
var request = require('supertest');

var app = require('../app.js');
var config = app.config;

describe('Summary', function() {
  this.timeout(30000);
  describe('record top', function() {
    it('returns the right field', function(done) {
      var q = {"genus": "acer"};
      var fields = ["scientificname"];
      request(app.server)
        .get("/v2/summary/top/records?rq=" + encodeURIComponent(JSON.stringify(q)) + "&top_fields=" + encodeURIComponent(JSON.stringify(fields)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property(fields[0]);
            Object.keys(response.body[fields[0]]).length.should.not.equal(0);
            done();
          }
        });
    });
  });
  describe('media top', function() {
    it('returns the right field', function(done) {
      var q = {"genus": "acer"};
      var fields = ["recordset"];
      request(app.server)
        .get("/v2/summary/top/media?rq=" + encodeURIComponent(JSON.stringify(q)) + "&top_fields=" + encodeURIComponent(JSON.stringify(fields)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property(fields[0]);
            Object.keys(response.body[fields[0]]).length.should.not.equal(0);
            done();
          }
        });
    });
  });
  describe('record count', function() {
    it('returns a valid count', function(done) {
      var q = {"genus": "acer"};
      var fields = ["scientificname"];
      request(app.server)
        .get("/v2/summary/count/records?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("itemCount");
            response.body.itemCount.should.be.a.float
            done();
          }
        });
    });
  });
  describe('media count', function() {
    it('returns a valid count', function(done) {
      var q = {"genus": "acer"};
      request(app.server)
        .get("/v2/summary/count/media?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("itemCount");
            response.body.itemCount.should.be.a.float
            done();
          }
        });
    });
  });
  describe('recordset count', function() {
    it('returns a valid count', function(done) {
      var q = {};
      request(app.server)
        .get("/v2/summary/count/recordset?rsq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("itemCount");
            response.body.itemCount.should.be.a.float
            done();
          }
        });
    });
  });
  describe('date histogram', function() {
    it('returns a valid histogram', function(done) {
      var q = {"genus": "acer"};
      request(app.server)
        .get("/v2/summary/datehist?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("dates");
            response.body.dates.should.be.a.Object
            Object.keys(response.body.dates).length.should.not.equal(0);
            done();
          }
        });
    });
  });
  describe('stats', function(){
    it('returns a valid histogram for api', function(done) {
      request(app.server)
        .get("/v2/summary/stats/api")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("dates");
            response.body.dates.should.be.a.Object
            Object.keys(response.body.dates).length.should.not.equal(0);
            done();
          }
        });
    });
    it('returns a valid histogram for digest', function(done) {
      request(app.server)
        .get("/v2/summary/stats/digest")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("dates");
            response.body.dates.should.be.a.Object
            Object.keys(response.body.dates).length.should.not.equal(0);
            done();
          }
        });
    });
    it('returns a valid histogram for search', function(done) {
      request(app.server)
        .get("/v2/summary/stats/search")
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {
            response.body.should.have.property("dates");
            response.body.dates.should.be.a.Object
            Object.keys(response.body.dates).length.should.not.equal(0);
            done();
          }
        });
    });
  });
});
