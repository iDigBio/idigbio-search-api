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
- TODO: Make an Elasticsearch initialisation script available?
