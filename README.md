# idb-search-api


The iDigBio search api is a nodejs that accepts search requests and
translates those into backend search requests.

## API Users

Developers who are interested in using the public iDigBio Search API /
iDigBio API v2 service should consult the wiki which includes a list
of endpoints, parameters, and query format.

https://github.com/idigbio/idigbio-search-api/wiki

## Development

[![Build Status](https://travis-ci.com/iDigBio/idigbio-search-api.svg?branch=master)](https://travis-ci.com/iDigBio/idigbio-search-api)


The remainder of this document is for developers who are interested in
the internals of the API code itself.

Please contact the iDigBio Technical Team (idigbio@acis.ufl.edu) if you need assistance installing, running, or developing code from this repository.

### Installing for Development

TBD

### Getting Started

**NODE_ENV**

Default value is "development".

NODE_ENV is used to control certain aspects (such as whether to connect
to a local redis use a prod server).
Known possible values are "prod", "development", "test", and "beta".

"development" requires redis to be running locally (at localhost:6379)

"prod" uses production redis server.

**CLUSTER_WORKERS**

Default value is auto-calculated (related to number of CPU cores).

Use CLUSTER_WORKERS to specify number of processes.  e.g. for easier debugging
of "prod" environment on a developer workstation, set to 1.

**LOGGER_LEVEL**

Default value is aligned to NODE_ENV, so "development" will log at debug
level, "prod" will log at info lovel.

Use LOGGER_LEVEL to specify the severity of events that go into log outputs.
Common values are "info" or "debug".

Example to run the "prod" code for debugging purposes:

```$ CLUSTER_WORKERS=1 LOGGER_LEVEL=debug NODE_ENV=prod npm start```



**The following information may not work as-is.**

### Dependencies

Development requires a redis server at localhost.

```
sudo apt install redis-server
```



To install and run on *Ubuntu 14.04*:
```
sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test;
sudo apt-get update;
sudo apt-get install gcc-4.8 g++-4.8;
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.8 20;
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 20;
sudo g++ --version;
sudo apt-get update ;
sudo apt-get install libjpeg8-dev libjpeg-turbo8-dev libpng12-dev libcairo-dev libgif-dev libmapnik2.2 libmapnik2-dev
npm install
npm start
```

On *Ubuntu 16.04* it may work with fewer steps (TBD), you will still need:
`libjpeg-turbo8-dev libpng12-dev libgif-dev`.

On *Ubuntu 18.04* 

```
# wget -O /tmp/nodesource_setup.sh https://deb.nodesource.com/setup_6.x; bash /tmp/nodesource_setup.sh

 nano /etc/apt/preferences.d/nodejs

--- put this contents in there to ensure ubuntu uses the new repository---
Package: nodejs
Pin: origin deb.nodesource.com
Pin-Priority: 1001
----

apt-get install -y wget build-essential python
apt-get install -y nodejs
npm install -g yarn

docker pull redis:3.2.12-alpine
docker run -d --name redis -p 6379:6379 redis:3.2.12-alpine

[cd to directory with search-pi]
[run the below as a normal user]

npm install
CLUSTER_WORKERS=1 LOGGER_LEVEL=debug NODE_ENV=development npm start
```

