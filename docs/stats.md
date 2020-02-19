# telemetry stats (sending)

The search api sends interaction telemetry data back for reporting purposes.

see `example-telemetry-stats-dto.json` for a minimal example of this structure.  You can also look in the `tests/mocks` folder for more examples.

This action takes place [in searchShim.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/searchShim.js#L74).  There is a partial config for stats in HAproxy, but note that only the backend is declared and there's no frontend for routing it.  The host is hardcoded in this project code ([statsFromResponse.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/lib/statsFromResponse.js#L46)) and goes directly to the server running the receiving api.

# telemetry and record/collection/etc stats (loading)

The search api makes the stats available for display on the portal and for other uses.  

E.g., `/v2/summary/stats/`  in [controllers/summary.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/controllers/summary.js#L212) . 

For insight into how the portal loads stats via the search api, see [publishers.js](https://github.com/iDigBio/idb-portal/blob/master/app/controllers/publishers.js#L14) in the portal repo.

For insight into how the stats are aggregated from raw telemetry/recordsets into something that the search api and portal can load, see [the backend](https://github.com/iDigBio/idb-backend/tree/master/idb/stats).