FROM node

WORKDIR /app

COPY ./package.json .

COPY ./yarn.lock .

RUN yarn

ENV port=4000

EXPOSE 4000

COPY . .

CMD ["yarn", "start"]
