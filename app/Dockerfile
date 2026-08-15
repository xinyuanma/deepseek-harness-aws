FROM node:22-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		python3 \
		make \
		g++ \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN npm install -g @deepseek-ai/dsh

CMD ["dsh", "web"]