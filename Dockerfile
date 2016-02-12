FROM nodesource/trusty:0.10.41

ADD package.json package.json
RUN npm install
ADD . .

EXPOSE 19196

CMD ["node","app.js"]
