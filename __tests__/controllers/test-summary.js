jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
jest.mock("redisclient");
jest.mock('esclient');

import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest';

import app from "app";
import config from "config";

describe('Summary', function() {
  let server = null;
  beforeAll(async function() {
    await app.ready;
    server = app.listen();
    config.maxLimit = 47;
  });
  afterAll(() => server.close());

  describe('record top', function() {
    it('uses `scientificname` as the default top_fields', async function() {
      var q = {"genus": "acer"};
      const response = await request(server)
            .get("/v2/summary/top/records")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.scientificname).to.be.an("Object");
      console.log(response.body.scientificname);
      Object.keys(response.body.scientificname).length.should.not.equal(0);
    });
    it("should accept a count parameter`", async function() {
      var q = {"genus": "acer"};
      const response = await request(server)
            .post("/v2/summary/top/basic")
            .send({"rq": q, "count": 5})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.scientificname).to.be.an("Object");
      Object.keys(response.body.scientificname).length.should.not.equal(0);
    });

    it('returns the field specified', async function() {
      var q = {"order": "myrtales"};
      var fields = ["genus"];
      const response = await request(server)
            .get("/v2/summary/top/records")
            .query({rq: JSON.stringify(q), top_fields: JSON.stringify(fields)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body[fields[0]]).to.be.an("Object");
      Object.keys(response.body[fields[0]]).length.should.not.equal(0);
    });
  });

  describe('media top', function() {
    it('uses `flags` as the default top_fields', async function() {
      var q = {"genus": "acer"};
      const response = await request(server)
            .get("/v2/summary/top/media")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.flags).to.be.an('Object');
      Object.keys(response.body.flags).length.should.not.equal(0);
    });
    it('returns the field specified', async function() {
      var q = {"genus": "acer"};
      var fields = ["recordset"];
      const response = await request(server)
            .get("/v2/summary/top/media")
            .query({rq: JSON.stringify(q), top_fields: JSON.stringify(fields)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body[fields[0]]).to.be.an("Object");
      Object.keys(response.body[fields[0]]).length.should.not.equal(0);
    });
  });
  describe('recordset top', async function() {
    it('uses `publisher` as the default top_field', async function() {
      const response = await request(server)
            .get("/v2/summary/top/recordsets")
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.publisher).to.be.an("Object");
      Object.keys(response.body.publisher).length.should.not.equal(0);
    });
    it('returns the field specified', async function() {
      var fields = ["data.contacts.email"];
      const response = await request(server)
            .get("/v2/summary/top/recordsets")
            .query({top_fields: JSON.stringify(fields)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body[fields[0]]).to.be.an("object");
      Object.keys(response.body[fields[0]]).length.should.not.equal(0);
    });
  });

  describe('record count', function() {
    it('returns a valid count', async function() {
      var q = {"genus": "acer"};
      var fields = ["scientificname"];
      const response = await request(server)
            .get("/v2/summary/count/records")
            .query({rq: JSON.stringify(q), top_fields: JSON.stringify(fields)})
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body).to.have.property('itemCount');
      expect(response.body.itemCount).to.be.a('Number');
      //not all records; but should be plenty big enough for the forseeable future to not trigger falsly
      expect(response.body.itemCount).to.be.below(50000000);
    });
  });

  describe('media count', function() {
    it('returns a valid count', async function() {
      var q = {"genus": "acer"};
      const response = await request(server)
            .get("/v2/summary/count/media")
            .query({rq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("itemCount");
      response.body.itemCount.should.be.a('Number');
    });
  });

  describe('recordset count', function() {
    it('returns a valid count', async function() {
      var q = {};
      const response = await request(server)
            .get("/v2/summary/count/recordset")
            .query({rsq: JSON.stringify(q)})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("itemCount");
      response.body.itemCount.should.be.a('Number');
    });
  });

  describe('date histogram', function() {
    it('returns a valid histogram', async function() {
      var q = {"genus": "acer"};
      const response = await request(server)
            .get("/v2/summary/datehist")
            .query({rq: JSON.stringify(q)})
            .query({minDate: "2014-01-01", maxDate: "2014-12-31"})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("dates");
      response.body.dates.should.be.a('Object');
      Object.keys(response.body.dates).length.should.not.equal(0);
    });
  });

  // uncomment for live ClickHouse system

/*
  describe('stats', function() {
    it('returns a valid histogram for api', async function() {
      const response = await request(server)
            .get("/v2/summary/stats/api")
            .query({minDate: "2015-01-01", maxDate: "2016-12-31"})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("dates");
      response.body.dates.should.be.a('Object');
      Object.keys(response.body.dates).length.should.not.equal(0);
    });
    it('returns a valid histogram for digest', async function() {
      const response = await request(server)
            .get("/v2/summary/stats/digest")
            .query({minDate: "2015-01-01", maxDate: "2016-12-30"})
            .expect('Content-Type', /json/)
            .expect(200);

      response.body.should.have.property("dates");
      response.body.dates.should.be.a('Object');
      Object.keys(response.body.dates).length.should.not.equal(0);
    });
    it('returns a valid histogram for search', async function() {
      const response = await request(server)
            .get("/v2/summary/stats/search")
            .query({minDate: "2015-01-01", maxDate: "2016-12-31"})
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("dates");
      response.body.dates.should.be.a('Object');
      Object.keys(response.body.dates).length.should.not.equal(0);
    });
  });*/
});
