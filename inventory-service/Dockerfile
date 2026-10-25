
FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-timeout=300000

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
