import _ from "lodash";
import request from 'supertest-as-promised';

import app from 'app';

describe('Management routes', function() {
  const server = app.listen();

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
