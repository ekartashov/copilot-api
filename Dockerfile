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

# Support multiple GitHub tokens for rotation
ARG GH_TOKEN
ARG GH_TOKENS
ENV GH_TOKEN=$GH_TOKEN
ENV GH_TOKENS=$GH_TOKENS

<<<<<<< HEAD
CMD bun run dist/main.js start -g $GH_TOKEN
=======
RUN mkdir -p /root/.local/share/copilot-api/ && \
    chmod 755 /root/.local/share/copilot-api/ && \
    touch /root/.local/share/copilot-api/github_token

<<<<<<< HEAD
CMD bun run dist/main.js start -g $GH_TOKEN --vision
>>>>>>> 1ea806a (chore: Add podman support, fix auth in containers)
=======
# Create volume for persistent token storage and configuration
VOLUME ["/root/.local/share/copilot-api"]

CMD bun run dist/main.js start --vision
>>>>>>> 7f5043b (test: Add testing framework & Docs)
