FROM node

WORKDIR /app

COPY . .

RUN yarn

ENV port=4000

EXPOSE 4000

CMD ["yarn", "start"]
