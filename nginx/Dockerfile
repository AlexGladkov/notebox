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
COPY tailwind.config.js .
COPY postcss.config.js .

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
