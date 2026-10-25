
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3002

CMD ["npm", "run", "start:dev"]
