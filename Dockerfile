FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY server.js ./

USER node

EXPOSE 3000

CMD ["node", "server.js"]
