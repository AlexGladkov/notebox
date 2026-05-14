# Multi-stage build для frontend и nginx
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники frontend
COPY . .

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
