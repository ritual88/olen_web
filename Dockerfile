# Сборка и запуск сайта в контейнере.
# Нужен, если на хостинге выбран вариант «Dockerfile» вместо готового Node.js.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/server.mjs ./
COPY --from=build /app/api ./api
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "server.mjs"]
