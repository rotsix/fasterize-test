FROM node:alpine as base
WORKDIR /app
COPY package*.json ./

FROM base as test
RUN npm ci
COPY . .
CMD [ "npm", "run", "test" ]

FROM base as prod
RUN npm ci --production
COPY . .
CMD [ "npm", "run", "app" ]
EXPOSE 3000
