FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
