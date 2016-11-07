"use strict";

var _ = require('lodash');
var should = require('chai').should();  // eslint-disable-line no-unused-vars

var app = require('../app.js');
var config = app.config;

describe('Background tasks', function() {
  describe('load-index-terms', function() {
    var litmod = require('../app/lib/load-index-terms')(app, config);
    it('should read the mappings and get the index terms', function(done) {
      litmod.loadIndexTerms()
        .then(function(indexterms) {
          indexterms.should.be.eql(config.indexterms);
          indexterms.should.have.all.keys(['publishers', 'recordsets', 'records', 'mediarecords']);
          _.keys(indexterms['recordsets']).should.have.length.above(10);
        })
        .then(done);
    });
  });
  describe('load-recordsets', function() {

  });
});
