
import * as lastModified from "lib/lastModified";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

describe("Last Modified dates", function() {
  beforeEach(function() {
    lastModified.clear();
  });

  it("should be fetched from elasticsearch", async function() {
    const diff = await lastModified.updateLastModified();
    expect(diff).toEqual({'publishers': jasmine.any(Date),
                          'records': jasmine.any(Date),
                          'recordsets': jasmine.any(Date),
                          'mediarecords': jasmine.any(Date),
                         });
  });

  it('should not report any differences for two consecutive queries', async function() {
    //NB: if indexing happens during this test then it will probably fail
    const diff1 = await lastModified.updateLastModified();
    expect(diff1).toEqual({'publishers': jasmine.any(Date),
                          'records': jasmine.any(Date),
                          'recordsets': jasmine.any(Date),
                          'mediarecords': jasmine.any(Date),
                          });
    const diff2 = await lastModified.updateLastModified();
    expect(diff2).toEqual({});
  });

  it("should return the date", async function() {
    await lastModified.updateLastModified();
    expect(lastModified.default()).toEqual(jasmine.any(Date));
    expect(lastModified.default("publishers")).toEqual(jasmine.any(Date));
    expect(lastModified.default("recordsets")).toEqual(jasmine.any(Date));
    expect(lastModified.default("records")).toEqual(jasmine.any(Date));
    expect(lastModified.default("mediarecords")).toEqual(jasmine.any(Date));
    expect(lastModified.default(["records", "mediarecords"])).toEqual(jasmine.any(Date));
  });
});
