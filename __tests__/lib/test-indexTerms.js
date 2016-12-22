import _ from "lodash";

import * as indexTerms from "lib/indexTerms";

describe('index terms', function() {
  it('should have been imported', function() {
    expect(indexTerms.loadIndexTerms).toBeTruthy();
  });

  it('should load all terms', async function() {
    indexTerms.clear();
    const its = await indexTerms.loadIndexTerms();
    expect(its).toEqual({
      publishers: expect.any(Object),
      recordsets: expect.any(Object),
      records: expect.any(Object),
      mediarecords: expect.any(Object)
    });
  });

  it('should load terms for a given type', async function() {
    indexTerms.clear();
    const itt = await indexTerms.getMappingForType('records');
    expect(itt).toBeDefined();
    expect(indexTerms.indexterms.medirecords).toBeUndefined();
  });
});
