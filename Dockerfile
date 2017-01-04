# This doesn't work because `node:6` is based on Debian 8 which
# doesn't have a recent enough version of libstdc++5-dev, we need
# node6 for other features though and in order for mapnik to work on
# node6 we need the recent C++.
#FROM node:6

FROM ubuntu:xenial
RUN apt-get update; apt-get install -y wget build-essential python
RUN wget -O /tmp/nodesource_setup.sh https://deb.nodesource.com/setup_6.x; bash /tmp/nodesource_setup.sh
RUN apt-get install -y nodejs

WORKDIR /opt/
ADD package.json /opt/package.json
RUN npm install
ADD . /opt/
RUN cd /opt/ && npm run build

EXPOSE 19196

CMD ["npm", "start"]
