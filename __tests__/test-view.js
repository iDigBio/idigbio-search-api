
import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
should();
import request from 'supertest-as-promised';

import app from '../src/app';


describe('View', function() {
  const server = app.listen();

  describe('basic', function() {
    it('should accept get', async function() {
      const response = await request(server)
            .get("/v2/view/records/0000012b-9bb8-42f4-ad3b-c958cb22ae45")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal("0000012b-9bb8-42f4-ad3b-c958cb22ae45");

    });
    it('should work for recordsets', async function() {
      const response = await request(server)
        .get("/v2/view/recordsets/6bb853ab-e8ea-43b1-bd83-47318fc4c345")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal("6bb853ab-e8ea-43b1-bd83-47318fc4c345");
      response.body.type.should.equal("recordsets");
      response.body.data.collection_name.should.equal("UF Invertebrate Zoology");

    });
    it('should work for publishers', async function() {
      const response = await request(server)
        .get("/v2/view/publishers/076c0ff6-65e9-48a5-8e4b-2447936f9a1c")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal("076c0ff6-65e9-48a5-8e4b-2447936f9a1c");
      response.body.type.should.equal("publishers");

    });
    _.each(['publishers', 'recordsets', 'records', 'mediarecords'],
           function(t) {
             it('should 404 on missing ' + t, async function() {
               const response = await request(server)
                 .get("/v2/view/" + t + "/00000000-0000-0000-0000-000000000000")
                 .expect('Content-Type', /json/)
                 .expect(404);
               response.body.error.should.equal("Not Found");

             });
           }
          );
    it('should have media aliased to mediarecords', async function() {
      const response = await request(server)
        .get("/v2/view/media/00100314-3220-4107-87f3-43cfdfa0cf10")
        .expect('Content-Type', /json/)
        .expect(200);
      response.body.uuid.should.equal("00100314-3220-4107-87f3-43cfdfa0cf10");

    });
  });
});
