
import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest-as-promised';

import app from '../src/app';


describe('Home', function() {
  const server = app.listen();

  describe('index', function() {
    it('should contain v1', async function() {
      const response = await request(server)
            .get("/")
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.v1).to.be.a('string');
    });

    it('should contain v2', async function() {
      const response = await request(server)
            .get("/")
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body.v2).to.be.a('string');

    });
  });


  describe('v1', function() {
    it('should contain the appropriate types', async function() {
      const response = await request(server)
            .get("/v1")
            .expect('Content-Type', /json/)
            .expect(200);
      expect(response.body).to.have.all.keys(["records", "mediarecords", "recordsets", "publishers"]);
    });
  });

  describe('v2', function() {
    it('should contain view', async function() {
      const response = await request(server)
            .get("/v2")
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("view");
    });
    it('should contain search', async function() {
      const response = await request(server)
            .get("/v2")
            .expect('Content-Type', /json/)
            .expect(200);
      response.body.should.have.property("search");
    });
    it('should contain mapping', async function() {
      const response = await request(server)
            .get("/v2")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.should.have.property("mapping");
    });
  });

  describe('search proxy', function() {
    describe('search', function() {
      it('should accept get', async function() {
        const response = await request(server)
              .get("/idigbio/records/_search")
              .query({size: 1})
          .expect('Content-Type', /json/)
          .expect(200);
        response.body.should.have.property("hits");
      });
      it('should accept post', async function() {
        const response = await request(server)
          .post("/idigbio/records/_search")
          .send({"size": 1})
          .expect('Content-Type', /json/)
          .expect(200);
        response.body.should.have.property("hits");
      });
    });
    describe('count', function() {
      it('should accept get', async function() {
        const response = await request(server)
          .get("/idigbio/records/_count")
          .expect('Content-Type', /json/)
          .expect(200);
        response.body.should.have.property("count");
      });
      it('should accept post', async function() {
        const response = await request(server)
          .post("/idigbio/records/_count")
          .send({})
          .expect('Content-Type', /json/)
          .expect(200);
        response.body.should.have.property("count");
      });
    });
  });
  describe('meta fields', function() {
    it('should not be blank for records', async function() {
      const response = await request(server)
        .get("/v2/meta/fields/records")
        .expect('Content-Type', /json/)
        .expect(200);
      Object.keys(response.body).length.should.not.equal(0);
    });
    it('should not be blank for media records', async function() {
      const response = await request(server)
        .get("/v2/meta/fields/mediarecords")
        .expect('Content-Type', /json/)
        .expect(200);
      Object.keys(response.body).length.should.not.equal(0);
    });
    it('should not be blank for media', async function() {
      const response = await request(server)
        .get("/v2/meta/fields/media")
        .expect('Content-Type', /json/)
        .expect(200);
      Object.keys(response.body).length.should.not.equal(0);
    });
  });
});
