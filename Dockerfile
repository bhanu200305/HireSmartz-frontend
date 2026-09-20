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

# Vite inlines every VITE_* value into the compiled JS at build time -
# setting these on the running container does nothing (they're gone by
# then). They must be supplied as --build-arg on `docker build` so they
# land in process.env before `pnpm run build` runs, which is what actually
# makes it into /app/dist/assets/*.js. Declaring them as ENV here (rather
# than leaving them as bare ARGs) also makes process.env win over any
# leftover .env file that COPY . . might have picked up, since Vite gives
# process.env priority over .env file contents.
ARG VITE_BACKEND_ENDPOINT
ARG VITE_BACKEND_PREFIX
ARG VITE_AUTH_SERVICE_ENDPOINT
ARG VITE_ORG_SERVICE_ENDPOINT
ARG VITE_NOTIFICATION_SERVICE_ENDPOINT
ARG VITE_JOB_SERVICE_ENDPOINT
ARG VITE_AI_SERVICE_ENDPOINT
ARG VITE_CANDIDATE_SERVICE_ENDPOINT
ARG VITE_INTERVIEW_SERVICE_ENDPOINT
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_BYPASS_AUTH
ARG VITE_NYLAS_CLIENT_ID
ARG VITE_AGORA_APP_ID
ARG VITE_TEMP_TOKEN
ARG VITE_CHANNEL_NAME
ARG VITE_INTERVIEW_FEEDBACK_FEATURE
ARG VITE_VIDEO_CONSENT_FEATURE
ARG VITE_NYLAS_FEATURE

ENV VITE_BACKEND_ENDPOINT=$VITE_BACKEND_ENDPOINT \
    VITE_BACKEND_PREFIX=$VITE_BACKEND_PREFIX \
    VITE_AUTH_SERVICE_ENDPOINT=$VITE_AUTH_SERVICE_ENDPOINT \
    VITE_ORG_SERVICE_ENDPOINT=$VITE_ORG_SERVICE_ENDPOINT \
    VITE_NOTIFICATION_SERVICE_ENDPOINT=$VITE_NOTIFICATION_SERVICE_ENDPOINT \
    VITE_JOB_SERVICE_ENDPOINT=$VITE_JOB_SERVICE_ENDPOINT \
    VITE_AI_SERVICE_ENDPOINT=$VITE_AI_SERVICE_ENDPOINT \
    VITE_CANDIDATE_SERVICE_ENDPOINT=$VITE_CANDIDATE_SERVICE_ENDPOINT \
    VITE_INTERVIEW_SERVICE_ENDPOINT=$VITE_INTERVIEW_SERVICE_ENDPOINT \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_BYPASS_AUTH=$VITE_BYPASS_AUTH \
    VITE_NYLAS_CLIENT_ID=$VITE_NYLAS_CLIENT_ID \
    VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID \
    VITE_TEMP_TOKEN=$VITE_TEMP_TOKEN \
    VITE_CHANNEL_NAME=$VITE_CHANNEL_NAME \
    VITE_INTERVIEW_FEEDBACK_FEATURE=$VITE_INTERVIEW_FEEDBACK_FEATURE \
    VITE_VIDEO_CONSENT_FEATURE=$VITE_VIDEO_CONSENT_FEATURE \
    VITE_NYLAS_FEATURE=$VITE_NYLAS_FEATURE

RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
