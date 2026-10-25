
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-timeout=300000

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
