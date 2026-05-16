# Проблема инфраструктуры тестирования: nginx-proxy конфигурация

**Дата обнаружения:** 2026-05-16  
**Severity:** CRITICAL  
**Статус:** ТРЕБУЕТ ИСПРАВЛЕНИЯ В ПАЙПЛАЙНЕ

---

## Описание проблемы

При запуске E2E тестов пайплайн создаёт nginx-proxy контейнер с **неправильной конфигурацией**, которая не соответствует исправлениям в репозитории.

### Симптомы

- API запросы `/api/*` возвращают XML ошибки от MinIO вместо JSON от backend
- Демо-логин не работает (HTTP 400 Bad Request)
- Кнопка "Войти в демо" не функционирует

### Root Cause

**Файл:** `/tmp/swarm-test-nginx/notebox-knopka-voyti-v-demo-ne-rabotae-test/default.conf`  
**Проблема:** Конфигурация содержит неправильный upstream:

```nginx
# НЕПРАВИЛЬНАЯ конфигурация (генерируется пайплайном)
set $backend_upstream http://minio:9000;  # ← ОШИБКА!

location /api/ {
    proxy_pass $backend_upstream$request_uri;
}
```

**Ожидаемая конфигурация:**

```nginx
# ПРАВИЛЬНАЯ конфигурация (есть в репозитории nginx/default.conf)
location /api/ {
    proxy_pass http://server:8080;  # ← ПРАВИЛЬНО
    # ... остальные заголовки
}
```

---

## Расхождение с репозиторием

В репозитории nginx/default.conf **УЖЕ ИСПРАВЛЕН** (коммит 458a5d6 от 2026-05-14):

```bash
$ git log --oneline | grep nginx
458a5d6 fix: исправлена nginx конфигурация для корректного проксирования API
632e353 refactor: улучшена конфигурация nginx и docker-compose
```

Но пайплайн **не использует** эту конфигурацию для nginx-proxy, а генерирует свою собственную с устаревшими значениями.

---

## Временное решение (Runtime Fix)

Во время тестирования конфигурация была исправлена вручную:

```bash
# Исправление конфигурации
cat > /tmp/swarm-test-nginx/notebox-knopka-voyti-v-demo-ne-rabotae-test/default.conf << 'EOF'
resolver 127.0.0.11 valid=5s ipv6=off;
server {
    listen 80;
    set $backend_upstream http://server:8080;  # Исправлено!
    location /api/ {
        proxy_pass $backend_upstream$request_uri;
        # ... остальные настройки
    }
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Перезапуск контейнера
docker restart notebox-knopka-voyti-v-demo-ne-rabotae-test-nginx-proxy-1
```

После этого исправления **все API тесты прошли успешно**.

---

## Рекомендации для постоянного исправления

### Вариант 1: Использовать конфигурацию из репозитория (РЕКОМЕНДУЕТСЯ)

Изменить пайплайн, чтобы nginx-proxy использовал `nginx/default.conf` из репозитория вместо генерации собственной конфигурации:

```yaml
# docker-compose.test.yml
nginx-proxy:
  image: nginx:alpine
  volumes:
    - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro  # ← Использовать файл из репозитория
    - /tmp/swarm-frontends/.../:/usr/share/nginx/html:ro
```

### Вариант 2: Исправить генератор конфигурации в пайплайне

Найти код пайплайна, который генерирует `/tmp/swarm-test-nginx/.../default.conf` и изменить:

```diff
- set $backend_upstream http://minio:9000;
+ set $backend_upstream http://server:8080;
```

---

## Верификация исправления

После применения исправления в пайплайне проверить:

```bash
# 1. Проверить содержимое конфигурации в контейнере
docker exec <nginx-proxy> cat /etc/nginx/conf.d/default.conf | grep -A2 "location /api/"
# Должно содержать: proxy_pass http://server:8080

# 2. Проверить API
curl -X POST http://localhost:<port>/api/auth/demo
# Должен вернуть: HTTP 200 с JSON {"data":{"email":"demo@notebox.app",...}}
# НЕ должен возвращать: HTTP 400 с XML <Error><Code>BadRequest</Code>...
```

---

## Impact

- **Критичность:** HIGH — без исправления E2E тесты всегда будут требовать ручного исправления конфигурации
- **Scope:** Затрагивает все E2E тесты, использующие nginx-proxy
- **Workaround:** Возможен (runtime fix), но не автоматизируем

---

## Связанные файлы

- `nginx/default.conf` — правильная конфигурация (в репозитории)
- `docker-compose.test.yml` — определение nginx-proxy контейнера
- `.test-results.json` — результаты тестирования с деталями проблемы
- `specs/bugs/BUG_DIAGNOSTIC_knopka_voyti_v_demo.md` — исходная диагностика бага

---

## История

- **2026-05-14:** Исправление внесено в репозиторий (коммит 458a5d6)
- **2026-05-16:** Обнаружено, что пайплайн не использует исправленную конфигурацию
- **2026-05-16:** Применён runtime fix, тесты прошли успешно
- **2026-05-16:** Создана данная документация
