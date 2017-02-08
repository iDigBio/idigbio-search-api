
import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();

// import config from "config";
// import app from "app";

import queryShim from "lib/query-shim.js";

describe('Query Shim', function() {
  describe('value support', function() {
    it('should support strings', async function() {
      var parsed = queryShim({
        "genus": "acer"
      });
      parsed.query.filtered.filter.and[0].term.should.have.property("genus");
    });
    it('should lowercase strings', async function() {
      var parsed = queryShim({
        "genus": "Acer"
      });
      parsed.query.filtered.filter.and[0].term.should.have.property("genus");
      parsed.query.filtered.filter.and[0].term.genus.should.equal("acer");
    });
    it('should support numbers', async function() {
      var parsed = queryShim({
        "version": 2
      });
      parsed.query.filtered.filter.and[0].term.should.have.property("version");
    });
    it('should support booleans', async function() {
      var parsed = queryShim({
        "hasImage": true
      });
      parsed.query.filtered.filter.and[0].term.should.have.property("hasImage");
    });
    it('should support lists of strings', async function() {
      var parsed = queryShim({
        "genus": ["acer", "quercus"]
      });
      parsed.query.filtered.filter.and[0].terms.should.have.property("genus");
      parsed.query.filtered.filter.and[0].terms.genus.should.be.an('Array');
      parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
      parsed.query.filtered.filter.and[0].terms.genus.should.eql(["acer", "quercus"]);
    });
    it('should lowercase lists of strings', async function() {
      var parsed = queryShim({
        "genus": ["Acer", "Quercus"]
      });
      parsed.query.filtered.filter.and[0].terms.should.have.property("genus");
      parsed.query.filtered.filter.and[0].terms.genus.should.be.an('Array');
      parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
      parsed.query.filtered.filter.and[0].terms.genus.should.eql(["acer", "quercus"]);
    });
    it('should support list of numbers', async function() {
      var parsed = queryShim({
        "version": [2, 3]
      });
      parsed.query.filtered.filter.and[0].terms.should.have.property("version");
      parsed.query.filtered.filter.and[0].terms.version.should.be.an('Array');
      parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
    });
    it('should support list of booleans', async function() {
      var parsed = queryShim({
        "hasImage": [true, false]
      });
      parsed.query.filtered.filter.and[0].terms.should.have.property("hasImage");
      parsed.query.filtered.filter.and[0].terms.hasImage.should.be.an('Array');
      parsed.query.filtered.filter.and[0].terms.execution.should.equal("or");
    });
  });
  describe('type support', function() {
    it('should support exists', async function() {
      var parsed = queryShim({
        "genus": {
          "type": "exists"
        }
      });
      parsed.query.filtered.filter.and[0].should.have.property("exists");
    });
    it('should support missing', async function() {
      var parsed = queryShim({
        "genus": {
          "type": "missing"
        }
      });
      parsed.query.filtered.filter.and[0].should.have.property("missing");
    });
    it('should support range', async function() {
      var parsed = queryShim({
        "minelevation": {
          "type": "range",
          "gte": "100",
          "lte": "200"
        }
      });
      parsed.query.filtered.filter.and[0].should.have.property("range");
    });
    it('should support geo_bounding_box', async function() {
      var parsed = queryShim({
        "geopoint": {
          "type": "geo_bounding_box",
          "top_left": {
            "lat": 19.23,
            "lon": -130
          },
          "bottom_right": {
            "lat": -45.1119,
            "lon": 179.99999
          }
        }
      });
      parsed.query.filtered.filter.and[0].should.have.property("geo_bounding_box");
    });
    it('should support geo_distance', async function() {
      var parsed = queryShim({
        "geopoint": {
          "type": "geo_distance",
          "distance": "100km",
          "lat": -46.3445,
          "lon": 110.454
        }});
      parsed.query.filtered.filter.and[0].should.have.property("geo_distance");
    });
    it('should support fulltext', async function() {
      var parsed = queryShim({
        "data": {
          "type": "fulltext",
          "value": "aster"
        }
      });
      parsed.query.filtered.query.match._all.should.have.property("query");
    });
    it('should support prefix', async function() {
      var parsed = queryShim({
        "family": {
          "type": "prefix",
          "value": "aster"
        }
      });
      parsed.query.filtered.filter.and[0].should.have.property("prefix");
    });
  });
});
