
describe('app', function() {
  it("should be importable", function() {
    // All the other tests import it outside of a test. In that case if
    // there is an error then jest doesn't catch that well.
    require('../src/app');
  });
});
