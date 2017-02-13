jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
jest.mock("redisclient");
jest.mock('esclient');

import _ from 'lodash';

import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest';


import app from 'app';

const testRecord = "0000012b-9bb8-42f4-ad3b-c958cb22ae45";
const testRecordset = "6bb853ab-e8ea-43b1-bd83-47318fc4c345";
const testPublisher = "076c0ff6-65e9-48a5-8e4b-2447936f9a1c";
const testMediarecord = "00100314-3220-4107-87f3-43cfdfa0cf10";
const test404 = "00000000-0000-0000-0000-000000000000";

describe('View', function() {
  let server = null;
  beforeAll(async function() {
    await app.ready;
    server = app.listen();
  });
  afterAll(() => server.close());

  describe('basic', function() {
    it('should accept get', async function() {
      const response = await request(server)
            .get("/v2/view/records/" + testRecord)
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal(testRecord);
    });
    it('should work for recordsets', async function() {
      const response = await request(server)
        .get("/v2/view/recordsets/" + testRecordset)
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal(testRecordset);
      response.body.type.should.equal("recordsets");
      response.body.data.collection_name.should.equal("UF Invertebrate Zoology");
    });
    it('should work for publishers', async function() {
      const response = await request(server)
        .get("/v2/view/publishers/" + testPublisher)
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal(testPublisher);
      response.body.type.should.equal("publishers");
    });
    _.each(['publishers', 'recordsets', 'records', 'mediarecords'],
           function(t) {
             it('should 404 on missing ' + t, async function() {
               const response = await request(server)
                 .get("/v2/view/" + t + "/" + test404)
                 .expect('Content-Type', /json/)
                 .expect(404);
               response.body.error.should.equal("Not Found");
             });
           }
          );

    it('should have media aliased to mediarecords', async function() {
      const response = await request(server)
        .get("/v2/view/media/" + testMediarecord)
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal(testMediarecord);
    });
  });
});
