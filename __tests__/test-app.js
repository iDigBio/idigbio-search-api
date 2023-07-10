jest.mock('redisclient');
jest.mock('esclient');

describe('app', function() {
  it("should be importable", async function() {
    // All the other tests import it outside of a test. In that case if
    // there is an error then jest doesn't catch that well.
    const app = require('app');
    await app.ready;
  });
});
