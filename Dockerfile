# This doesn't work because `node:6` is based on Debian 8 which
# doesn't have a recent enough version of libstdc++5-dev, we need
# node6 for other features though and in order for mapnik to work on
# node6 we need the recent C++.
#FROM node:6

FROM ubuntu:focal
RUN apt-get update; DEBIAN_FRONTEND="noninteractive" TZ="America/New_York" apt-get install -y tzdata wget build-essential python
#RUN wget -O /tmp/nodesource_setup.sh https://deb.nodesource.com/setup_6.x; bash /tmp/nodesource_setup.sh
RUN apt-get install -y nodejs npm
RUN npm install -g n
RUN n 8.10.0
RUN npm install -g yarn
RUN mkdir -p /var/www; chown www-data:www-data /var/www
USER www-data
WORKDIR /var/www
ADD package.json /var/www/package.json
RUN npm install
RUN yarn install; yarn cache clean
ADD . /var/www
RUN yarn build

EXPOSE 19196

CMD ["npm", "start"]
