FROM docker.io/oven/bun:alpine AS builder
WORKDIR /app

COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM docker.io/oven/bun:alpine AS runner
WORKDIR /app

COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts --no-cache

COPY --from=builder /app/dist ./dist

EXPOSE 4141

ARG GH_TOKEN
ENV GH_TOKEN=$GH_TOKEN

<<<<<<< HEAD
CMD bun run dist/main.js start -g $GH_TOKEN
=======
RUN mkdir -p /root/.local/share/copilot-api/ && \
    touch /root/.local/share/copilot-api/github_token

CMD bun run dist/main.js start -g $GH_TOKEN --vision
>>>>>>> 1ea806a (chore: Add podman support, fix auth in containers)
