jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
jest.mock("redisclient");

import _ from "lodash";
import request from 'supertest';

import app from 'app';

describe('Management routes', function() {
  let server = null;
  beforeAll(async function() {
    server = app.listen();
    await app.ready;
  });
  afterAll(() => server.close());

  it('should 404 on /manage', async function() {
    await request(server)
      .get("/manage/")
      .expect('Content-Type', /json/)
      .expect(404);
  });

  _.each(['indexterms', 'recordsets'], function(noun) {
    var root = "/manage/" + noun;
    describe('Route ' + root, function() {
      it('should respond with list' + noun, async function() {
        await request(server)
          .get(root)
          .expect('Content-Type', /json/)
          .expect(200);
      });
      it('should be able to trigger a reload', async function() {
        await request(server)
          .get(root + "/reload")
          .expect(302);
      });
    });
  });
});
