# =========================================================
# FIFA Ticketing Hub 2026 — Frontend (React + Vite)
# Build statique servi par nginx (utilisable hors Azure Static Web Apps si besoin)
# =========================================================

# ---------- Stage build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage runtime ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback : toutes les routes inconnues servent index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
