
import timer from 'lib/timer';


describe("Function timer", function() {
  it('should pass arguments and return value', async function() {
    var testfn = async function(a, b) {
      return a + b;
    };
    const val = await timer(testfn)(1, 2);
    expect(val).toBe(3);
  });

  it("Shouldn't swallow errors", async function() {
    var testErrFn = async function(a, b) {
      throw new Error("Bad fn, no cookie.");
    };

    try {
      await timer(testErrFn)(1, 2);
      fail("testErrFn should have thrown");
    } catch (e) {
      expect(e.message).toEqual('Bad fn, no cookie.');
    }
  });
  it("Should take a name as first arg", async function() {
    var testfn = async function(a, b) {
      return a + b;
    };
    const val = await timer("foo", testfn)(1, 2);
    expect(val).toBe(3);
  });
});
