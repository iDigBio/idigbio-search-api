# Troubleshooting & Common Errors

### (initial setup) Failed at the hiredis@0.5.0 install script.

After running `npm install` for the first time:
```
> hiredis@0.5.0 install /com.github.iDigBio.idigbio-search-api/node_modules/hiredis
> node-gyp rebuild

gyp ERR! configure error
gyp ERR! stack Error: Command failed: python2 -c import platform; print(platform.python_version());
gyp ERR! stack pyenv: python2: command not found
gyp ERR! System Linux 6.2.0-34-generic
gyp ERR! command "~/.nvm/versions/node/v8.10.0/bin/node" "~/.nvm/versions/node/v8.10.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "rebuild"
gyp ERR! cwd /com.github.iDigBio.idigbio-search-api/node_modules/hiredis
gyp ERR! node -v v8.10.0
gyp ERR! node-gyp -v v3.6.2
gyp ERR! not ok
npm WARN The package babel-polyfill is included as both a dev and production dependency.
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@1.2.13 (node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@1.2.13: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})

npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! hiredis@0.5.0 install: `node-gyp rebuild`
npm ERR! Exit status 1
npm ERR!
npm ERR! Failed at the hiredis@0.5.0 install script.
```

#### Cause

The version of _node-gyp_ used by this project only supports python2.

#### Suggestions

Try the following, then retry `npm install`
- Install python2.7.18
- **(untested)** Try updating _npm_ or [updating the npm-bundled version of node-gyp](https://github.com/nodejs/node-gyp/blob/main/docs/Updating-npm-bundled-node-gyp.md) <!-- modified: 2022-07-13 04:25 EDT, accessed: 2023-11-14 -->

### (testing) Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.&nbsp;/<br/>expected 200 "OK", got 500 "Internal Server Error"&nbsp;/<br/>No living connections

This applies if tests are either running very slowly and failing with messages similar to:

```
● Summary › stats › returns a valid histogram for digest

    Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.
      
      at Timeout.callback [as _onTimeout] (node_modules/jsdom/lib/jsdom/browser/Window.js:523:19)
      at ontimeout (timers.js:436:11)
      at tryOnTimeout (timers.js:300:5)
      at listOnTimeout (timers.js:263:5)
      at Timer.processTimers (timers.js:223:10)

  ● Summary › stats › returns a valid histogram for digest

    TypeError: Cannot read property 'address' of null
      
      at Test.Object.<anonymous>.Test.serverAddress (node_modules/supertest/lib/test.js:55:18)
      at new Test (node_modules/supertest/lib/test.js:36:12)
      at Object.obj.(anonymous function) [as get] (node_modules/supertest/index.js:25:14)
      at Object.<anonymous> (__tests__/controllers/test-summary.js:171:9)
          at Generator.next (<anonymous>)
      at step (__tests__/controllers/test-summary.js:10:431)
      at __tests__/controllers/test-summary.js:10:668
      at Object.<anonymous> (__tests__/controllers/test-summary.js:10:331)
      From previous event:
      at Timeout.callback (node_modules/jsdom/lib/jsdom/browser/Window.js:523:19)
      at ontimeout (timers.js:436:11)
      at tryOnTimeout (timers.js:300:5)
      at listOnTimeout (timers.js:263:5)
      at Timer.processTimers (timers.js:223:10)
```

or failing very quickly with messages similar to:

```
● View › basic › should work for publishers

expected 200 "OK", got 500 "Internal Server Error"

  at Test.Object.<anonymous>.Test._assertStatus (node_modules/supertest/lib/test.js:268:12)
  at Test.Object.<anonymous>.Test._assertFunction (node_modules/supertest/lib/test.js:283:11)
  at Test.Object.<anonymous>.Test.assert (node_modules/supertest/lib/test.js:173:18)
  at localAssert (node_modules/supertest/lib/test.js:131:12)
  at node_modules/supertest/lib/test.js:128:5
  at Test.Object.<anonymous>.Request.callback (node_modules/superagent/lib/node/index.js:728:3)
  at parser (node_modules/superagent/lib/node/index.js:916:18)
  at IncomingMessage.res.on (node_modules/superagent/lib/node/parsers/json.js:19:7)
  at IncomingMessage.emit (events.js:203:15)
  at endReadableNT (_stream_readable.js:1145:12)
  at process._tickCallback (internal/process/next_tick.js:63:19)
  From previous event:
  at step (__tests__/controllers/test-view.js:12:555)
  at __tests__/controllers/test-view.js:12:656
  From previous event:
  at Object.<anonymous> (__tests__/controllers/test-view.js:12:319)
  From previous event:
  at runCallback (timers.js:705:18)
  at tryOnImmediate (timers.js:676:5)
  at processImmediate (timers.js:658:5)
  From previous event:
  at process._tickCallback (internal/process/next_tick.js:68:7)
```

#### Cause

Elasticsearch connection might not be able to be established.  

#### Suggestions

Ensure target Elasticsearch server is available from the host you are running tests from.

Navigating to "http://target-elasticsearch-host:9200/" should immediately return JSON version information.

If timeouts occur, the Elasticsearch servers are only accessible from certain subnets. Attempted connections outside these subnets are silently dropped, so your Elasticsearch client will not be sent a rejection.  
If failing quickly, ensure the correct Elasticsearch server is being targeted (see [/src/config.js](src/config.js)) with URL scheme ("http://").

### (runtime) InvalidTypeError

Either seen in the network monitor of web browser developer tools (responses with HTTP 400 return codes:  
```json
{
"error":"Invalid type",
"statusCode":400,
"name":"InvalidTypeError",
"type":"records",
"headers":{"Access-Control-Allow-Origin":"http://localhost:3000"}
}
```
) or in the console session running `npm`:
> **info**: ::ffff:127.0.0.1 - "POST /v2/search/records/ HTTP/1.1" 400 150 - 51.517 ms  
> **error**: Request error InvalidTypeError: Invalid type  
> &nbsp;&nbsp;&nbsp;at getMappingForType (/idigbio-search-api/src/lib/indexTerms.js:45:11)  
> &nbsp;&nbsp;&nbsp;(rest of stack trace omitted)

#### Cause

Elasticsearch might not be fully set up

#### Suggestions

- *(UF ACIS staff only)*  
	Adjust [config.js](src/config.js) to point to our beta Elasticsearch server, which is already set up and ready for testing:
	```diff
	@@ -29,16 +29,14 @@ var config = {
	 port: 19196,
	 search: {
	-  server: "http://esnode01-prod:9200",
	+  server: "http://esnode01-beta:9200",
	   index: process.env.SEARCH_INDEX || indexAlias,
	   statsIndex: process.env.STATS_INDEX || "stats",
	 },
	 elasticsearch: {
	   hosts: [
	-    "http://esnode01-prod:9200",
	-    "http://esnode02-prod:9200",
	-    "http://esnode03-prod:9200"
	+    "http://esnode01-beta:9200"
	   ],
	   apiVersion: "2.4",
	   sniffOnStart: false,
	```
- See Elasticsearch setup instructions in [our idb-backend project](https://github.com/iDigBio/idb-backend/blob/master/tests/README.md#dependencies) [\[permalink\]](https://github.com/iDigBio/idb-backend/blob/6b33df16b35b0b30d5447f6e7ea14133438ea7fd/tests/README.md#dependencies)
