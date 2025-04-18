/* eslint-disable no-negated-condition */
import searchShim from "searchShim";
import config from "config";
import logger from "logging";
import cache from "cache";

export var recordsets = {};

async function _loadAll() {
  logger.info("Querying recordsets list");
  const body = await searchShim(config.search.index, "recordsets", "_search", { size: config.maxRecordsets });
  var res = {};
  body.hits.hits.forEach(function(hit) {
    const id = hit._id,
      source = hit._source;
    if(source.data) {
      res[id] = {
        "uuid": id,
        "name": source.data.collection_name,
        "description": source.data.collection_description,
        "logo": source.data.logo_url,
        "url": source.data.institution_web_address,
        "emllink": source.emllink,
        "archivelink": source.archivelink,
        "contacts": source.data.contacts,
        "data_rights": source.data.data_rights,
        "publisher": source.publisher,
      };
    }
  });
  const sizes = await searchShim(config.search.index, "records", "_search", { "query": { "match_all": {} }, "size": 0, "aggs": { "recordset_counts": { "terms": { "field": "recordset", "size": config.maxRecordsets } } } });
  sizes.aggregations.recordset_counts.buckets.forEach(function (b) {
    if (res[b.key]) {
      res[b.key]["totalCount"] = b.doc_count;
    } else {
      res[b.key] = { "totalCount": b.doc_count };
    }
  });
  console.log(Object.keys(res).length)
  return res;
}

export async function loadAll() {
  try {
    recordsets = await cache.wrap("recordsets", _loadAll);
  } catch (e) {
    logger.error("Failed loading recordsets, %s", e);
  }
}


export async function get(id) {
  var rs = recordsets[id];
  if (rs) {
    return rs;
  }
  await loadAll();
  rs = recordsets[id];
  if (rs) {
    return rs;
  }
  throw new Error("Can't find recordset: " + id);
}

export async function clearcache() {
  recordsets = {};
}
