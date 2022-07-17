FROM debian

RUN apt upgrade

RUN apt update

RUN apt install -y wget

RUN apt install -y python3

RUN apt install -y build-essential

WORKDIR /node

RUN wget https://unofficial-builds.nodejs.org/download/release/v16.7.0/node-v16.7.0-linux-x86.tar.gz

# node-v16.7.0-linux-x86.tar.gz

RUN gzip -d node-v16.7.0-linux-x86.tar.gz

RUN tar -xf node-v16.7.0-linux-x86.tar

RUN ls node-v16.7.0-linux-x86

RUN ls /

RUN mv node-v16.7.0-linux-x86/bin/* /bin/
RUN mv node-v16.7.0-linux-x86/include/* /include/
RUN mv node-v16.7.0-linux-x86/lib/* /lib/

WORKDIR /app

COPY ./package.json .

COPY ./yarn.lock .

RUN npm install -g yarn

RUN yarn

EXPOSE 32400

COPY . .

CMD ["yarn", "start"]
