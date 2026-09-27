FROM node:22-alpine AS base
WORKDIR /usr/src/app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# .dockerignore excludes .env/.env.* — a developer's local file (localhost
# URLs, placeholder values, possibly VITE_BYPASS_AUTH=true) must never end up
# in a shipped build. Real values come in as --build-arg from the deploy
# pipeline instead, one per VITE_* variable in .env.example, materialized as
# ENV below so Vite picks them up the same way it would a .env file.
COPY . .

ARG VITE_BACKEND_ENDPOINT
ARG VITE_INTERVIEW_SERVICE_ENDPOINT
ARG VITE_BACKEND_PREFIX
ARG VITE_AUTH_SERVICE_ENDPOINT
ARG VITE_ORG_SERVICE_ENDPOINT
ARG VITE_NOTIFICATION_SERVICE_ENDPOINT
ARG VITE_JOB_SERVICE_ENDPOINT
ARG VITE_AI_SERVICE_ENDPOINT
ARG VITE_CANDIDATE_SERVICE_ENDPOINT
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_AGORA_APP_ID
ARG VITE_NYLAS_CLIENT_ID
# The Nylas scheduler widget's own API base (ScheduleCalendarPage's
# `NylasScheduling schedulerApiUrl`) — distinct from VITE_NYLAS_CLIENT_ID
# above. Was never threaded through this build stage, so any image built
# from this Dockerfile shipped that widget pointed at '' (app.constants.ts's
# fallback) regardless of what was actually set in the deploy environment.
ARG VITE_NYLAS_SCHEDULER_API_URL
ARG VITE_TEMP_TOKEN
ARG VITE_CHANNEL_NAME
ARG VITE_INTERVIEW_FEEDBACK_FEATURE
ARG VITE_VIDEO_CONSENT_FEATURE
ARG VITE_NYLAS_FEATURE
# Never true outside local dev — see .env.example's own warning on this var.
ARG VITE_BYPASS_AUTH=false
# Every api/*Api.ts client checks this for `=== 'development'` to decide
# whether to send the ngrok-skip-browser-warning header. Left unset here on
# purpose for a real production build (undefined !== 'development' is the
# correct, safe default) — only needs a value for an ngrok-fronted non-prod
# build from this same Dockerfile.
ARG VITE_ENV

ENV VITE_BACKEND_ENDPOINT=$VITE_BACKEND_ENDPOINT \
    VITE_INTERVIEW_SERVICE_ENDPOINT=$VITE_INTERVIEW_SERVICE_ENDPOINT \
    VITE_BACKEND_PREFIX=$VITE_BACKEND_PREFIX \
    VITE_AUTH_SERVICE_ENDPOINT=$VITE_AUTH_SERVICE_ENDPOINT \
    VITE_ORG_SERVICE_ENDPOINT=$VITE_ORG_SERVICE_ENDPOINT \
    VITE_NOTIFICATION_SERVICE_ENDPOINT=$VITE_NOTIFICATION_SERVICE_ENDPOINT \
    VITE_JOB_SERVICE_ENDPOINT=$VITE_JOB_SERVICE_ENDPOINT \
    VITE_AI_SERVICE_ENDPOINT=$VITE_AI_SERVICE_ENDPOINT \
    VITE_CANDIDATE_SERVICE_ENDPOINT=$VITE_CANDIDATE_SERVICE_ENDPOINT \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID \
    VITE_NYLAS_CLIENT_ID=$VITE_NYLAS_CLIENT_ID \
    VITE_NYLAS_SCHEDULER_API_URL=$VITE_NYLAS_SCHEDULER_API_URL \
    VITE_TEMP_TOKEN=$VITE_TEMP_TOKEN \
    VITE_CHANNEL_NAME=$VITE_CHANNEL_NAME \
    VITE_INTERVIEW_FEEDBACK_FEATURE=$VITE_INTERVIEW_FEEDBACK_FEATURE \
    VITE_VIDEO_CONSENT_FEATURE=$VITE_VIDEO_CONSENT_FEATURE \
    VITE_NYLAS_FEATURE=$VITE_NYLAS_FEATURE \
    VITE_BYPASS_AUTH=$VITE_BYPASS_AUTH \
    VITE_ENV=$VITE_ENV

RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=3s CMD wget --spider -q http://localhost:5173 || exit 1

CMD ["serve", "-s", "dist", "-l", "5173"]
