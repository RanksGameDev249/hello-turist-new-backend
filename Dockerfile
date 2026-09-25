FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts

RUN npm run build

ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["npm", "start"]
