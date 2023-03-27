# Build the static client, then serve it with nginx.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY src ./src

# Baked into the bundle at build time: the URL the *browser* uses to reach the API.
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
