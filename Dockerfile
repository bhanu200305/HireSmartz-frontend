FROM node:22-alpine AS base
WORKDIR /usr/src/app
# Pins pnpm to the exact version in package.json's "packageManager" field -
# corepack fetches and caches it on first use, same version every build.
RUN corepack enable

FROM base AS dependencies
# pnpm-workspace.yaml holds the `overrides` block the lockfile was resolved
# against (see its own comments) and .npmrc holds build-allowlist settings -
# omitting either makes pnpm see a different effective config than what
# generated the lockfile, and --frozen-lockfile refuses to proceed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
