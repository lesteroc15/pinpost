# PinPost server image. We control the base ourselves so we can install the
# fonts that Sharp/librsvg needs to render the BEFORE/AFTER text on collages.
FROM node:20-bookworm-slim

# Fonts + fontconfig so SVG text overlays render properly.
# tini gives us proper PID 1 signal handling.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fontconfig \
      fonts-dejavu-core \
      tini \
      ca-certificates \
 && fc-cache -f \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for better Docker layer caching.
COPY package.json package-lock.json* ./
COPY client/package.json ./client/

# Install root server deps.
RUN npm install --omit=dev --no-audit --no-fund

# Copy the rest of the source and build the client bundle.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server/index.js"]
