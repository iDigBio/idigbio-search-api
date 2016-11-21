import adapt from 'koa-adapter';
import _ from 'lodash';

import config from "../../config";
import api from "../api";
import searchShim from "../searchShim.js";
import recordsets from "../lib/recordsets";

// version:
// http://idb-riak.acis.ufl.edu:8098/buckets/record_catalog/keys/0000012b-9bb8-42f4-ad3b-c958cb22ae45
// http://idb-riak.acis.ufl.edu:8098/buckets/record/keys/0000012b-9bb8-42f4-ad3b-c958cb22ae45-14cdaa01e6581b4af8b5d544c9eaa2750b2eb4cf
export async function basic(ctx, next) {
  const uuid = ctx.params.uuid;
  let t = ctx.params.t || "_all";
  if(t === "media") { t = "mediarecords"; }

  const query = {
    "query": {
      "term": {
        "uuid": uuid
      }
    }
  };
  let body = await searchShim(config.search.index, t, "_search", query, {
    type: "view",
    recordtype: t,
    ip: ctx.ip,
  });
  if(body.hits.hits.length > 0) {
    body = body.hits.hits[0];
    var indexterms = _.cloneDeep(body._source);
    delete indexterms["data"];
    var rb = ctx.body = {
      "uuid": body._id,
      "type": body._type,
      "etag": body._source.etag,
      "version": body._source.version,
      "data": body._source.data,
      "recordIds": body._source.recordIds,
      "indexTerms": indexterms,
      "attribution": {}
    };
    const rsid = body._source.recordset;
    if(rsid) {
      let rs = null;
      try {
        rs =  await recordsets.get(rsid);
      } catch (e) {
        rs = { "uuid": rsid };
      }
      rb.attribution = rs;
    }
    ctx.body = rb;
  } else {
    ctx.body = {
      "error": "Not Found",
      "statusCode": 404
    };
    ctx.response.status = 404;
  }
}

api.get('/v2/view/:t?/:uuid', basic);
