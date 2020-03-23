FROM node:12-alpine
COPY . /app
WORKDIR /app
RUN npm i
CMD npm start