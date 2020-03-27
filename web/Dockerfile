FROM node:12-alpine
COPY . /app
WORKDIR /app
ENV NODE_ENV=production 
RUN npm i --no-optional
CMD npm start