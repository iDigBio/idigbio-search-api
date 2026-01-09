FROM ubuntu:focal
RUN apt-get update; DEBIAN_FRONTEND="noninteractive" TZ="America/New_York" apt-get install -y tzdata wget build-essential python3
#RUN wget -O /tmp/nodesource_setup.sh https://deb.nodesource.com/setup_6.x; bash /tmp/nodesource_setup.sh
RUN apt-get install -y nodejs npm
RUN npm install -g n
RUN n 20.5.1
RUN npm install -g yarn
RUN mkdir -p /var/www; chown www-data:www-data /var/www
USER www-data
WORKDIR /var/www
ADD package.json /var/www/package.json
RUN npm install
RUN yarn install; yarn cache clean
RUN npm dedupe
ADD . /var/www
RUN yarn build

EXPOSE 19196

CMD ["npm", "start"]
