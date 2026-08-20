FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY resume-jsonrpc-server ./resume-jsonrpc-server

RUN npm ci --omit=dev

COPY discord-dsh.mjs ./
COPY discord-input.mjs ./
COPY discord-output.mjs ./
COPY discord-reactions.mjs ./
COPY typing-indicator.mjs ./
COPY session-queue.mjs ./
COPY dsh-result.mjs ./
COPY minimal.cordis.yml ./

RUN mkdir -p \
    /data/sessions \
    /workspace

ENV NODE_ENV=production
ENV DSH_SESSION_ROOT=/data/sessions
ENV DSH_CWD=/workspace

CMD ["node", "discord-dsh.mjs"]