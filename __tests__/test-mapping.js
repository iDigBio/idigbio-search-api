import _ from 'lodash';

import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest-as-promised';

import config from "config";
import app from "app";

describe('Mapping', function() {
  let server = null;
  beforeAll(() => { server = app.listen(); });
  afterAll(() => server.close());

  describe('map creation', function() {
    it('should return urls for tiles and points', async function() {
      var q = {"scientificname": "puma concolor"};
      const response = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      response.body.should.have.property("shortCode");
      response.body.should.have.property("tiles");
      response.body.should.have.property("geojson");
      expect(response.body.points).to.be.a('string');
      expect(response.body.attribution).to.be.an('Array');
      response.body.should.have.property("mapDefinition");

    });
    it('should return the same urls if called twice', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      response2.body.tiles.should.equal(response1.body.tiles);
      response2.body.geojson.should.equal(response1.body.geojson);
      response2.body.points.should.equal(response1.body.points);
    });
    it('should return the different urls if called twice with different queries', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      q = {"scientificname": "nullius nullium"};
      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      response2.body.tiles.should.not.equal(response1.body.tiles);
      response2.body.geojson.should.not.equal(response1.body.geojson);
      response2.body.points.should.not.equal(response1.body.points);
    });
    it('should return the different urls if called twice with different styles', async function() {
      var q = {"scientificname": "puma concolor"};
      var nonDefaultStyle = {
        fill: 'rgba(255,0,0,.4)',
        stroke: 'rgba(255,0,0,.6)'
      };
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q),
                    style: JSON.stringify(nonDefaultStyle)})
            .expect('Content-Type', /json/)
            .expect(200);

      response2.body.tiles.should.not.equal(response1.body.tiles);
      response2.body.geojson.should.not.equal(response1.body.geojson);
      response2.body.points.should.not.equal(response1.body.points);
    });
    it('should return the different urls if called twice with different types', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "points"})
            .expect('Content-Type', /json/)
            .expect(200);

      response2.body.tiles.should.not.equal(response1.body.tiles);
      response2.body.geojson.should.not.equal(response1.body.geojson);
      response2.body.points.should.not.equal(response1.body.points);
    });
  });

  describe('map definition retrieval', function() {
    it('should return the definition back when the short code url is called alone', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response2 = await request(server)
            .get("/v2/mapping/" + shortCode)
            .expect('Content-Type', /json/)
            .expect(200);
      response2.body.tiles.should.equal(response1.body.tiles);
      response2.body.geojson.should.equal(response1.body.geojson);
      response2.body.points.should.equal(response1.body.points);
    });
  });

  describe('png map tiles', function() {
    it('should return an png image for geohash maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q),
                    type: "geohash"})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
            .get("/v2/mapping/" + shortCode + "/1/0/0.png")
            .expect('Content-Type', /png/)
            .expect(200);
      response.body.length.should.not.equal(0);
    });

    it('should return an png image for point maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "points"})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
            .get("/v2/mapping/" + shortCode + "/1/0/0.png")
            .expect('Content-Type', /png/)
            .expect(200);

      response.body.length.should.not.equal(0);
    });

    it('should return an png image for auto maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "auto"})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
            .get("/v2/mapping/" + shortCode + "/1/0/0.png")
            .expect('Content-Type', /png/)
            .expect(200);
      response.body.length.should.not.equal(0);
    });
  });

  describe('geojson map tiles', function() {
    it('should return geojson for geohash maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "geohash"})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
            .get("/v2/mapping/" + shortCode + "/1/0/0.json")
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.type.should.equal("FeatureCollection");
      response.body.features.length.should.not.equal(0);
    });

    it('should return geojson for point maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "points"})
        .expect('Content-Type', /json/)
        .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/1/0/0.json")
        .expect('Content-Type', /json/)
        .expect(200);

      response.body.itemCount.should.not.equal(0);
      response.body.type.should.equal("FeatureCollection");
      response.body.features.length.should.not.equal(0);
    });
  });

  describe('utf8 grid map tiles', function() {
    it('should return utf8 grid for geohash maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "geohash"})
        .expect('Content-Type', /json/)
        .expect(200);

      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/1/0/0.grid.json")
        .expect('Content-Type', /json/)
        .expect(200);

      response.body.should.have.property("grid");
      response.body.should.have.property("data");
      response.body.should.have.property("keys");

    });

    it('should have values in data even if points are not styled', async function() {
      var q = {"stateprovince": "florida", "scientificname": {"type": "missing"}};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "geohash"})
        .expect('Content-Type', /json/)
        .expect(200);

      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/1/0/0.grid.json")
        .expect('Content-Type', /json/)
        .expect(200);

      response.body.should.have.property("grid");
      response.body.should.have.property("data");
      Object.keys(response.body.data).length.should.not.equal(0);
      response.body.should.have.property("keys");
    });

    it('should return utf8 grid for point maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "points"})
        .expect('Content-Type', /json/)
        .expect(200);

      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/1/0/0.grid.json")
        .expect('Content-Type', /json/)
        .expect(200);

      response.body.should.have.property("grid");
      response.body.should.have.property("data");
      response.body.should.have.property("keys");
    });
  });

  describe('retrieve map points', function() {
    it('should return data under normal conditions with bounding box data', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "geohash"})
        .expect('Content-Type', /json/)
        .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/points?lat=35&lon=-106&zoom=1")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
      response.body.should.have.property("bbox");
    });

    it('should return data under normal conditions with point radius data', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "points"})
        .expect('Content-Type', /json/)
        .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/points?lat=32.7141666667&lon=-108.7086111111&zoom=1")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
      response.body.should.have.property("radius");
    });

    it('should return data for longitudes less than -180', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "geohash"})
        .expect('Content-Type', /json/)
        .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/points?lat=35&lon=-466&zoom=1")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
      response.body.should.have.property("bbox");
    });

    it('should return data for longitudes greater than 180', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
        .get("/v2/mapping/")
        .query({rq: JSON.stringify(q), type: "geohash"})
        .expect('Content-Type', /json/)
        .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/points?lat=35&lon=254&zoom=1")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
      response.body.should.have.property("bbox");
    });
  });


  // These are more of "dont crash" tests for coverage, rather than
  // corectness assements. Testing the PNGs for corectness is hard.
  describe('complex styles', function() {
    it('should support complex styles for geohash doc counts', async function() {
      var q = {"genus": "carex", "institutioncode": ["uf", "flas", "flmnh"]};
      var geohash_style = {"fill": "rgba(255,0,0,.4)",
                           "stroke": "rgba(255,0,0,.6)",
                           "doc_count": [
                             {"fill": "rgba(255,0,0,.4)", "stroke": "rgba(255,0,0,.6)"},
                             {"fill": "rgba(0,255,0,.4)", "stroke": "rgba(0,255,0,.6)"},
                             {"fill": "rgba(0,0,255,.4)", "stroke": "rgba(0,0,255,.6)"}
                           ]};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({type: 'geohash',
                    rq: JSON.stringify(q),
                    style: JSON.stringify(geohash_style)})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
        .get("/v2/mapping/" + shortCode + "/1/0/0.png")
        .expect('Content-Type', /png/)
        .expect(200);
      response.body.length.should.not.equal(0);
    });

    it('should support complex styles for point properties', async function() {
      var q = {"genus": "carex", "institutioncode": ["uf", "flas", "flmnh"]};
      var property_style = {"fill": "rgba(255,0,0,.4)",
                            "stroke": "rgba(255,0,0,.6)",
                            "institutioncode": {
                              "flas": {"fill": "rgba(255,0,0,.4)", "stroke": "rgba(255,0,0,.6)"},
                              "uf": {"fill": "rgba(0,255,0,.4)", "stroke": "rgba(0,255,0,.6)"},
                              "flmnh": {"fill": "rgba(0,0,255,.4)", "stroke": "rgba(0,0,255,.6)"}
                            }};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({type: 'points',
                    rq: JSON.stringify(q),
                    style: JSON.stringify(property_style)})
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response1.body.shortCode;
      expect(shortCode).to.be.a("string");
      const response = await request(server)
            .get("/v2/mapping/" + shortCode + "/1/0/0.png")
            .expect('Content-Type', /png/)
            .expect(200);
      response.body.length.should.not.equal(0);
    });
  });
});
