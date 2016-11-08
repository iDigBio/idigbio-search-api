"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var timer = require('../app/lib/timer');
var expect = require('chai').expect;
var assert = require('chai').assert;

describe("Function timer", function() {
  it('should pass arguments and return value', function(done) {
    var testfn = function(a, b) {
      return new Promise(function(resolve, reject) {
        resolve(a + b);
      });
    };

    var p = timer(testfn)(1, 2);
    p.then(function(val) {
      expect(val).to.equal(3);
    })
      .then(done);
  });

  it("Shouldn't swallow errors", function(done) {
    var testfn = function(a, b) {
      return new Promise(function(resolve, reject) {
        reject("Bad fn");
      });
    };
    var p = timer(testfn)(1, 2);
    p
      .then(function(arg) {
        assert.fail(arg, null, "Shouldn't get here");
      })
      .catch(function(arg) {
        expect(arg).to.equal("Bad fn");
      })
      .then(done);
  });
});
