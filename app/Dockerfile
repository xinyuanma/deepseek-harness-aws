FROM node:22-bookworm-slim

ARG DSH_VERSION=0.1.0-rc.6

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		python3 \
		make \
		g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN npm install -g @deepseek-ai/dsh@${DSH_VERSION}

CMD ["dsh", "web"]