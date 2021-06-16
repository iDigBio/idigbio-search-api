# telemetry stats (sending)

The search api sends interaction telemetry data back for reporting purposes.

see `example-telemetry-stats-dto.json` for a minimal example of this structure.  You can also look in the `tests/mocks` folder for more examples.

This action takes place [in searchShim.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/searchShim.js#L74).  There is a partial config for stats in HAproxy, but note that only the backend is declared and there's no frontend for routing it.  The host is hardcoded in this project code ([statsFromResponse.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/lib/statsFromResponse.js#L46)) and goes directly to the server running the [receiving api](https://github.com/iDigBio/telemetry-collector-api).

# telemetry and record/collection/etc stats (loading)

The search api makes the stats available for display on the portal and for other uses.  

E.g., `/v2/summary/stats/`  in [controllers/summary.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/controllers/summary.js#L212) . 

For insight into how the portal loads stats via the search api, see [publishers.js](https://github.com/iDigBio/idb-portal/blob/master/app/controllers/publishers.js#L14) in the portal repo.

For insight into how the stats are aggregated from raw telemetry/recordsets into something that the search api and portal can load, see [the backend](https://github.com/iDigBio/idb-backend/tree/master/idb/stats).

## telemetry stats

For an example of loading telemetry stats straight out of the api:

```
curl --location --request GET 'search.idigbio.org/v2/summary/stats/search' \
--header 'Content-Type: text/plain' \
--data-raw '{"dateInterval": "month", "minDate": "2020-01-16"}'

```


## recordset stats


These are used when the [portal](https://www.idigbio.org/portal/portalstats) calls into the search api `summary/stats/api` which maps to [summary.js](https://github.com/iDigBio/idigbio-search-api/blob/master/src/controllers/summary.js#L212) and calls `stats` which includes this part:

```
} else if(t === "api" || t === "digest") {
    internal_aggs = {
      "records": {
        "max": {
          "field": "records_count"
        }
      },
      "mediarecords": {
        "max": {
          "field": "mediarecords_count"
        }
      }
    };
```


Note that in the portal, these are named "ingest" stats (and are also used for the "ingestCumulative" numbers; the "culmulative" checkbox toggles between them). This is currently the second graph on the portalstats page.  

An api request to pull this info looks like this (adjust minDate as necessary):

```
curl --location --request GET 'search.idigbio.org/v2/summary/stats/api' \
--header 'Content-Type: application/json' \
--data-raw '{"dateInterval": "day", "minDate": "2020-02-15"}'
```


Also note that because the React pages are being rendered server-side, these api calls get made server-side, the data is loaded into a `data` var in the page rendering, and so you will not see the network calls in client network monitoring.
