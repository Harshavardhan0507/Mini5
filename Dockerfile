# Build the React storefront
FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Runtime: Express API + the static storefront on one origin
FROM node:24-bookworm-slim AS server
ENV NODE_ENV=production
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

# data/ holds the SQLite database — mount a persistent volume here in production
RUN mkdir -p /app/server/data /app/server/uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

EXPOSE 5000
CMD ["node", "server.js"]
