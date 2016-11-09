"use strict";

var _ = require('lodash');
var should = require('chai').should(), // eslint-disable-line no-unused-vars
    exepct = require('chai').execpt;   // eslint-disable-line no-unused-vars
var request = require('supertest'),
    app = require('../app.js');

describe('Management routes', function() {
  it('should 404 on /manage', function(done) {
    request(app.server)
      .get("/manage/")
      .expect('Content-Type', /json/)
      .expect(404)
      .end(function(error, response) {
        done();
      });
  });

  _.each(['indexterms', 'recordsets'], function(noun) {
    var root = "/manage/" + noun;
    describe('Route ' + root, function() {
      it('should respond with list' + noun, function(done) {
        request(app.server)
          .get(root)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(error, response) {
            done();
          });
      });
      it('should be able to trigger a reload', function(done) {
        request(app.server)
          .get(root + "/reload")
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(error, response) {
            done();
          });
      });
    });
  });
});
