jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
jest.mock("redisclient");
jest.mock('esclient');

import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest';

import config from "config";
import app from "app";

describe('Search Deprecated Endpoints', function() {
  let server = null;
  beforeAll(async function() {
    await app.ready;
    server = app.listen();
    config.maxLimit = 47;
  });
  afterAll(() => server.close());

  describe('basicGET', function() {
    it('should return an empty search for {"scientificname": "nullius nullius"}', async function() {
      var q = {"scientificname": "nullius nullius"};
      const response = await request(server)
            .get("/v2/search/")
            .query({rq: JSON.stringify(q), limit: 10})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.equal(0);
      response.body.items.length.should.equal(0);
    });
    it('should not return an empty search for {}', async function() {
      var q = {};
      const response = await request(server)
            .get("/v2/search/")
            .query({rq: JSON.stringify(q), limit: 10})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
    it('should be able to return a limited set of fields', async function() {
      var q = {"scientificname": {"type": "exists"}, "genus": "carex"};
      const response = await request(server)
            .get("/v2/search/")
            .query({rq: JSON.stringify(q),
                    fields: '["scientificname"]',
                    limit: 10})
            .expect('Content-Type', /json/)
            .expect(200);

      response.body.items[0].indexTerms.should.have.property("scientificname");
      Object.keys(response.body.items[0].indexTerms).length.should.equal(1);
    });
    it('should obey maxLimit', async function() {
      const bigLimit = 10000;
      expect(config.maxLimit).to.be.below(bigLimit);
      var q = {};
      const response = await request(server)
            .get("/v2/search/")
            .query({rq: JSON.stringify(q), limit: bigLimit, fields: '["uuid"]'})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.items.length).to.equal(config.maxLimit);
    });
  });

  describe('basicPOST', function() {
    it('should return an empty search for {"scientificname": "nullius nullius"}', async function() {
      var rq = {"scientificname": "nullius nullius"};
      const response = await request(server)
            .post("/v2/search/")
            .send({rq})
            .expect('Content-Type', /json/)
            .expect(200);

      response.body.itemCount.should.equal(0);
      response.body.items.length.should.equal(0);
    });
    it('should not return an empty search for {}', async function() {
      var q = {};
      const response = await request(server)
            .post("/v2/search/")
            .send({
              rq: q,
              limit: 10
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
    it('should be able to return a limited set of fields', async function() {
      var q = {"scientificname": {"type": "exists"}, "genus": "carex"};
      const response = await request(server)
            .post("/v2/search/")
            .send({
              rq: q,
              limit: 10,
              fields: ["scientificname"]
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items[0].indexTerms.should.have.property("scientificname");
      Object.keys(response.body.items[0].indexTerms).length.should.equal(1);
    });
    it('should obey maxLimit', async function() {
      var q = {};
      const response = await request(server)
            .post("/v2/search/")
            .send({
              rq: q,
              limit: 10000,
              fields: ["uuid"]
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items.length.should.be.below(config.maxLimit + 1);
    });
    it('should support multiple field sorting with an array', async function() {
      var q = {"family": "asteraceae"}, s = [{"genus": "desc"}, {"specificepithet": "asc"}];
      const response = await request(server)
            .post("/v2/search/")
            .send({
              rq: q,
              sort: s,
              limit: 10
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
    it('should support sorting with a single field name string', async function() {
      var q = {"family": "asteraceae"}, s = "genus";
      const response = await request(server)
            .post("/v2/search/")
            .send({
              rq: q,
              sort: s,
              limit: 10,
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
  });

  describe('mediaGET', function() {
    it('should return an empty search for {"type": "null"}', async function() {
      var q = {"type": "null"};
      const response = await request(server)
            .get("/v2/media/")
            .query({mq: JSON.stringify(q),
                    rq: JSON.stringify({})})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.equal(0);
      response.body.items.length.should.equal(0);
    });
    it('should not return an empty search for {}', async function() {
      var q = {};
      const response = await request(server)
            .get("/v2/media/")
            .query({mq: JSON.stringify(q),
                    rq: JSON.stringify({}),
                    limit: 10})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
    it('should be able to return a limited set of fields', async function() {
      var q = { "data.ac:accessURI": {"type": "exists"} };
      const response = await request(server)
            .get("/v2/media/")
            .query({fields: ["data.ac:accessURI"],
                    limit: 10,
                    mq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items[0].data.should.have.property("ac:accessURI");
      Object.keys(response.body.items[0].data).length.should.equal(1);
    });
    it('should obey maxLimit', async function() {
      const response = await request(server)
            .get("/v2/media/")
            .query({mq: JSON.stringify({}),
                    rq: JSON.stringify({}),
                    fields: JSON.stringify(["uuid"]),
                    limit: 10000})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items.length.should.be.below(config.maxLimit + 1);
    });
  });

  describe('mediaPOST', function() {
    it('should return an empty search for {"type": "null"}', async function() {
      var q = {"type": "null"};
      const response = await request(server)
            .post("/v2/media/")
            .send({
              rq: {},
              mq: q
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.equal(0);
      response.body.items.length.should.equal(0);
    });
    it('should not return an empty search for {}', async function() {
      var q = {};
      const response = await request(server)
            .post("/v2/media/")
            .send({
              rq: {},
              mq: q,
              limit: 10,
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.itemCount.should.not.equal(0);
      response.body.items.length.should.not.equal(0);
    });
    it('should be able to return a limited set of fields', async function() {
      var q = { "data.ac:accessURI": {"type": "exists"} };
      const response = await request(server)
            .post("/v2/media/")
            .send({
              mq: q,
              limit: 10,
              fields: ["data.ac:accessURI"]
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items[0].data.should.have.property("ac:accessURI");
      Object.keys(response.body.items[0].data).length.should.equal(1);
    });
    it('should obey maxLimit', async function() {
      var q = {};
      const response = await request(server)
            .post("/v2/media/")
            .send({
              rq: {},
              mq: q,
              limit: 10000,
              fields: ["uuid"]
            })
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.items.length.should.be.below(config.maxLimit + 1);
    });
  });
});
