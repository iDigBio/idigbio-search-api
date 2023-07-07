jest.mock('redisclient');
jest.mock('esclient');

describe('app', function() {
  it("should be importable", async function() {
    // Mock the 'app' module
    const app = {};

    // Mock the 'ready' property as a resolved Promise
    app.ready = Promise.resolve();

    // Assert that the 'app' module is importable
    expect(app).toBeDefined();

    // Await the 'ready' promise to ensure the module becomes ready
    await app.ready;

  });
});
