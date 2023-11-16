# idb-search-api
# ncd prod

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

> **NOTE:** Instructions for Ubuntu versions other than 22.04 may not work as-is.

> Skip to section:  
> [ubuntu 22.04 (jammy)](#ubuntu-2204-jammy)  
> [ubuntu 18.04 (bionic)](#ubuntu-1804-bionic)  
> [ubuntu 16.04 (xenial) / 14.04 (trusty)](#ubuntu-1604-xenial--1404-trusty)

#### ubuntu 22.04 (jammy)

##### Requirements

- node-8.10.0  
	If using [_nvm (Node Version Manager)_](https://github.com/nvm-sh/nvm), install and use via command:  
	`nvm install 8.10.0 && nvm use 8.10.0`
- python2.7, used by dependency _node-gyp_
- Redis, available via:
	- **apt:** `apt install redis-server`
	- **Docker:**  
		`docker run --rm \`  
		`--name idb-service-dev-redis \`  
		`-it -p 127.0.0.1:6379:6379 \`  
		`redis:5.0.3 redis-server`

##### Instructions

1. 
	Create and enter new Python virtual environment for this project.  
	If [_pyenv_](https://github.com/pyenv/pyenv) is available, the following can be performed:
	1. Create virtualenv:  
		`pyenv virtualenv 2.7.18 idb-search-py2.7.18`
	2. Set Python version for project (writes file '.python-version' to current directory):
		`pyenv local idb-search-py2.7.18`
	3. Activate newly-created virtualenv:  
		`pyenv activate`
2. 
	Install Node.js package dependencies:  
	`npm install`
3. 
	(recommended) Run tests:  
	`npm test`

	Expected result:
	```
	Test Suites: 16 passed, 16 total
	Tests:       209 passed, 209 total
	Snapshots:   0 total
	Time:        8.497s
	```

> Skip to next section: [Getting Started](#getting-started)

#### ubuntu 18.04 (bionic)

The following directions are still incomplete but can get tests to run successfully. Do the following as root.

> **NOTE:** Tests were run with Redis v4

Use the DOCKERFILE as a guide:

* download setup script:  
	`wget -O /tmp/nodesource_setup.sh https://deb.nodesource.com/setup_6.x`
* wget https://deb.nodesource.com/setup_6.x
* inspect the script
* run it:
	`bash /tmp/nodesource_setup.sh`

Note that after you run it, before you try to install node, you need to update the apt priorities or your system will likely still try to use the distribution package:

```
# create+edit the file:
nano /etc/apt/preferences.d/nodejs

# copy this into it
Package: nodejs
Pin: origin deb.nodesource.com
Pin-Priority: 1001
```

then install nodejs and other dependencies:

```
sudo apt-get install -y nodejs wget build-essential python
npm install -g yarn
```

Setup local redis instance:

```
docker pull redis:3.2.12-alpine
docker run -d --name redis -p 127.0.0.1:6379:6379 redis:3.2.12-alpine
```


Now, as your normal user:

```
# clone the repo
git clone https://github.com/iDigBio/idigbio-search-api.git

# install packages
npm install

```

Run tests: 

```
npm test

[...]
Test Suites: 16 passed, 16 total
Tests:       209 passed, 209 total
Snapshots:   1 passed, 1 total
Time:        12.73s
Ran all test suites.
```

to run a single test, call it with the path to the test file:

```
npm test __tests__/lib/<somefile>.js
```

> Skip to next section: [Getting Started](#getting-started)

#### ubuntu 16.04 (xenial) / 14.04 (trusty)

> **TIP:** For Ubuntu 16.04, the following Ubuntu 14.04 instructions may work with fewer steps (TBD), but you will still need:
> `libjpeg-turbo8-dev libpng12-dev libgif-dev`.

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

### Getting Started

For local development, run the following command:  
`$ CLUSTER_WORKERS=1 LOGGER_LEVEL=debug NODE_ENV=development npm start`

Environment variables are explained below:

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

## Statistics

See: [docs](https://github.com/iDigBio/idigbio-search-api/blob/master/src/docs/)
