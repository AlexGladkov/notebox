# Multi-stage build для frontend и nginx
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем только необходимые файлы для frontend build
COPY src ./src
COPY public ./public
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY tailwind.config.js .
COPY postcss.config.js .

# Принимаем build arguments для конфигурации frontend
ARG VITE_BASE_PATH=""
ARG VITE_API_URL=""

# Передаём их как переменные окружения для Vite
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_API_URL=$VITE_API_URL

# Собираем production build
RUN npm run build

# Финальный образ с nginx
FROM nginx:alpine

# Копируем собранный frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
