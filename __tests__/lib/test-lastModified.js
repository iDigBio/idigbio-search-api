
import * as lastModified from "lib/lastModified";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

describe("Last Modified dates", function() {
  beforeEach(function() {
    lastModified.clear();
  });

  it("should be fetched from elasticsearch", async function() {
    const diff = await lastModified.updateLastModified();
    expect(diff).toEqual(expect.objectContaining({
      'publishers': expect.any(Date),
      'records': expect.any(Date),
      'recordsets': expect.any(Date),
      'mediarecords': expect.any(Date),
    }));
  });

  it('should not report any differences for two consecutive queries', async function() {
    //NB: if indexing happens during this test then it will probably fail
    const diff1 = await lastModified.updateLastModified();
    expect(diff1).toEqual(expect.objectContaining({
      'publishers': expect.any(Date),
      'records': expect.any(Date),
      'recordsets': expect.any(Date),
      'mediarecords': expect.any(Date),
    }));
    const diff2 = await lastModified.updateLastModified();
    expect(diff2).toEqual({});
  });

  it("should return the date", async function() {
    await lastModified.updateLastModified();
    expect(lastModified.getLastModified()).toEqual(jasmine.any(Date));
    expect(lastModified.getLastModified("publishers")).toEqual(jasmine.any(Date));
    expect(lastModified.getLastModified("recordsets")).toEqual(jasmine.any(Date));
    expect(lastModified.getLastModified("records")).toEqual(jasmine.any(Date));
    expect(lastModified.getLastModified("mediarecords")).toEqual(jasmine.any(Date));
    expect(lastModified.getLastModified(["records", "mediarecords"])).toEqual(jasmine.any(Date));
  });
});
