# Etapa 1: Build estático do Expo Web (PWA)
FROM node:20-alpine AS build
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=1536"
ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web

# Etapa 2: Servidor Nginx servindo o PWA e fazendo proxy reverso de /api para capricha-api
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
