import _ from 'lodash';

import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest-as-promised';

import config from "config";
import app from "app";


jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

describe('Mapping', function() {
  let server = null;
    beforeAll(async function() {
    server = app.listen();
    return app.ready;
  });
  afterAll(() => server.close());

  describe('map creation', function() {
    it('should return urls for tiles and points', async function() {
      var q = {"scientificname": "puma concolor"};
      const response = await request(server)
            .get('/v2/mapping/')
            .query({rq: JSON.stringify(q)})
            .redirects(1)
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("shortCode");
      response.body.should.have.property("tiles");
      response.body.should.have.property("geojson");
      expect(response.body.points).to.be.a('string');
      expect(response.body.attribution).to.be.an('Array');
      response.body.should.have.property("mapDefinition");
      response.body.should.have.property("boundingBox");

    });
    it('should return the same urls if called twice', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302)
            .expect('Location', response1.header.location);

    });
    it('should return the different urls if called twice with different queries', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302);

      q = {"scientificname": "nullius nullium"};
      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302);
      expect(response1.header.location).to.not.equal(response2.header.location);
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
            .expect(302);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q),
                    style: JSON.stringify(nonDefaultStyle)})
            .expect(302);
      expect(response1.header.location).to.not.equal(response2.header.location);
    });
    it('should return different urls if called twice with different types', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302);

      const response2 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "points"})
            .expect(302);
      expect(response1.header.location).to.not.equal(response2.header.location);
    });

    it('should create with POST/GET the same', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .expect(302);
      const response2 = await request(server)
            .post("/v2/mapping/")
            .send({rq: JSON.stringify(q)})
            .expect(302);
      expect(response1.header.location).to.equal(response2.header.location);
    });

    it('should err on illegal map type', async function() {
      var q = {"scientificname": "puma concolor"};
      return request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q), type: "foobar"})
            .expect('Content-Type', /json/)
            .expect(400);
    });
  });

  describe('map definition retrieval', function() {
    it('should return the definition back when the short code url is called alone', async function() {
      var q = {"scientificname": "puma concolor"};
      const response = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q)})
            .redirects(1)
            .expect('Content-Type', /json/)
            .expect(200);
      const shortCode = response.body.shortCode;
      expect(shortCode).to.be.a("string");
      expect(response.body.tiles).to.be.a("string");
      expect(response.body.geojson).to.be.a("string");
      expect(response.body.points).to.be.a("string");
    });
    it('should 404 on an invalid shortcode', async function() {
      return request(server)
            .get("/v2/mapping/invalid/")
            .expect('Content-Type', /json/)
            .expect(404);
    });
  });

  describe('png map tiles', function() {
    it('should return an png image for geohash maps', async function() {
      var q = {"scientificname": "puma concolor"};
      const response1 = await request(server)
            .get("/v2/mapping/")
            .query({rq: JSON.stringify(q),
                    type: "geohash"})
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
            .redirects(1)
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
