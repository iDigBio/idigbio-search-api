"use strict";

var _ = require('lodash');
var should = require('chai').should(),  // eslint-disable-line no-unused-vars
    expect = require('chai').expect;    // eslint-disable-line no-unused-vars

var hash = require('../app/lib/hasher')().hash;


describe("Hasher", function() {
  it("Should hash an object", function() {
    expect(hash('md5', ['a', 'b', 'c']))
      .to.equal('8a53cbb58d7ff4a02733ed5e64dbb968');
  });
  it('should sort array if asked', function() {
    var h1 = hash('md5', ['b', 'a', 'c'], {sort_arrays: true});
    var h2 = hash('md5', ['c', 'a', 'b'], {sort_arrays: true});
    expect(h1).to.equal(h2);
  });
  it('should not sort arrays by default', function() {
    var h1 = hash('md5', ['b', 'a', 'c']);
    var h2 = hash('md5', ['b', 'a', 'c'], {sort_arrays: false});
    expect(h1).to.equal(h2);
  });

  it('should hash an object', function() {
    expect(hash('md5', {a: 1, b: 'foo', c: true, d: false}))
      .to.equal('a8ca69edaccdc7504b87aef7883d161d');
  });

  it('should sort object keys by default', function() {
    expect(hash('md5', {b: 'foo', c: true, a: 1}))
      .to.equal('0ae227922a53c43b6854cf049bb2fc1f');
    expect(hash('md5', {b: 'foo', c: true, a: 1}, {sort_keys: true}))
      .to.equal('0ae227922a53c43b6854cf049bb2fc1f');
    expect(hash('md5', {b: 'foo', c: true, a: 1}, {sort_keys: false}))
      .not.to.equal('0ae227922a53c43b6854cf049bb2fc1f');
  });

  it('should hash nested objects', function() {
    expect(hash('md5', {a: 1, b: 'foo', c: [1, 2, 3]}))
      .to.equal('1f9cf3034c409e735019b971f7058911');
    expect(hash('md5', ['foo', {a: 1, b: 'foo', c: [1, 2, 3]}]))
      .to.equal('bf8eef63e5cc3eeb65b2120b1f70f44a');
  });

  it('should behave reasonably with null and undefined', function() {
    expect(hash('md5', undefined))     // eslint-disable-line no-undefined
      .to.equal('5e543256c480ac577d30f76f9120eb74');
    expect(hash('md5', null))
      .to.equal('37a6259cc0c1dae299a7866489dff0bd');
  });

  it('should not mess with arguments', function() {
    var o = {a: 1, b: 'foo', c: true, d: false, e: [1, 2, 3]};
    var o2 = _.cloneDeep(o);
    hash('md5', o);
    expect(o).to.eql(o2);
  });
});
