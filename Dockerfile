FROM node:22-alpine AS base
WORKDIR /usr/src/app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copies repository contents including the newly created .env file
COPY . .

RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]