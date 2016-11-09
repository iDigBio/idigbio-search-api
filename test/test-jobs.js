"use strict";

var _ = require('lodash');
var expect = require('chai').expect,    // eslint-disable-line no-unused-vars
    should = require('chai').should();  // eslint-disable-line no-unused-vars

var app = require('../app.js');
var config = app.config;
var litmod = require('../app/lib/load-index-terms')(app, config);
var rsmod = require('../app/lib/recordsets')(app, config);

describe('Background jobs', function() {

  describe('load-index-terms', function() {
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
    it('should loadAll successfully', function(done) {
      rsmod.loadAll()
        .then(function(recordsets) {
          _.keys(recordsets).should.have.length.above(10);
        })
        .then(done);
    });
    it('should return a recordset', function(done) {
      rsmod.get('d5c32031-231f-4213-b0f1-2dc4bbf711a0')
        .catch(function(err) {
          expect(err).to.be.null;
        })
        .then(function(rs) {
          expect(rs).to.be.an('object');
        })
        .finally(done);
    });
    it('should return a recordset with the cache unprimed', function(done) {
      rsmod.clearcache();
      rsmod.get('d5c32031-231f-4213-b0f1-2dc4bbf711a0')
        .catch(function(err) {
          expect(err).to.be.null;
        })
        .then(function(rs) {
          expect(rs).to.be.an('object');
        })
        .finally(done);
    });
  });
});
