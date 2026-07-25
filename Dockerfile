FROM node:22-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
# Pinned to v4.5.2: Quartz v5 replaced the TypeScript config (quartz.config.ts +
# quartz.layout.ts) with a YAML plugin system, and silently ignores the v4 config
# rather than failing. Unpinning without migrating reverts the site to stock Quartz.
RUN git clone --depth 1 --branch v4.5.2 https://github.com/jackyzha0/quartz.git /quartz

WORKDIR /quartz
RUN npm ci

EXPOSE 8080
