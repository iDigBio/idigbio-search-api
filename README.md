# idb-search-api


The iDigBio search api is a nodejs that accepts search requests and
translates those into backend search requests.

## API Users

Developers who are interested in using the public iDigBio Search API /
iDigBio API v2 service should consult the wiki which includes a list
of endpoints, parameters, and query format.

https://github.com/idigbio/idigbio-search-api/wiki

## Development

[![Build Status](https://travis-ci.org/iDigBio/idigbio-search-api.svg?branch=master)](https://travis-ci.org/iDigBio/idigbio-search-api)


The remainder of this document is for developers who are interested in
the internals of the API code itself.

### Dependencies



To install and run on *Ubuntu 14.04*:
```
sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test;
sudo apt-get update;
sudo apt-get install gcc-4.8 g++-4.8;
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.8 20;
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 20;
sudo g++ --version;
sudo apt-get update -qq;
sudo apt-get install -qq libjpeg8-dev libjpeg-turbo8-dev libpng12-dev libcairo-dev libgif-dev libmapnik2.2 libmapnik2-dev
npm install
npm start
```

On *Ubuntu 16.04* it may work directly, you'll still probably need
`libjpeg-turbo8-dev libpng12-dev libgif-dev`.
