import _ from "lodash";
//import {expect, should} from 'chai';  // eslint-disable-line no-unused-vars
//should();


import * as indexTerms from "lib/indexTerms";
const allTypes = ['publishers', 'recordsets', 'records', 'mediarecords'];

describe('index terms', function() {
  it('should have been imported', function() {
    expect(indexTerms.loadIndexTerms).toBeTruthy();
  });

  it('should load all terms', async function() {
    indexTerms.clear();
    const its = await indexTerms.loadIndexTerms();
    expect(its.publishers).toBeDefined();
    expect(its.recordsets).toBeDefined();
    expect(its.records).toBeDefined();
    expect(its.mediarecords).toBeDefined();
  });

  it('should load terms for a given type', async function() {
    indexTerms.clear();
    const itt = await indexTerms.getMappingForType('records');
    expect(itt).toBeDefined();
    expect(indexTerms.indexterms.medirecords).toBeUndefined();
  });
});
