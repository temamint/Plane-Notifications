# Plane Webhook + Projects Viewer Bot

Node.js сервер для:

- получения вебхуков от [Plane.so](https://plane.so) и отправки уведомлений в Telegram,
- отображения списка проектов из Plane по маршруту `/projects`.

## 📁 Структура проекта

```
.
├── index.js                 # Точка входа, подключение маршрутов
├── .env                     # Переменные окружения (локально)
├── routes/
│   ├── projects.js          # Роут GET /projects
│   └── webhook.js           # Роут POST /webhook (Plane webhook)
├── utils/
│   ├── messageFormatter.js  # Форматирование задач и комментариев
│   ├── telegram.js          # Отправка сообщений в Telegram
│   └── signature.js         # Проверка подписи Plane
│   └── planeApi.js          # Axios-инстанс для Plane API
└── ...
```

## ⚙️ Настройки окружения (.env)

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
CHAT_ID=@your_channel_or_user_id

# Webhook
PLANE_WEBHOOK_SECRET=your_plane_webhook_secret

# Plane API
PLANE_API_BASE_URL=https://api.plane.so/api/v1
PLANE_API_KEY=your_plane_api_key
PLANE_WORKSPACE_SLUG=your_workspace_slug

# Express
PORT=3000
```

## 🚀 Запуск

1. Установи зависимости:

   ```bash
   npm install
   ```

2. Запусти сервер:

   ```bash
   node index.js
   ```

3. Проверь:
   - [http://localhost:3000/projects](http://localhost:3000/projects) — HTML-страница с проектами.
   - [POST http://localhost:3000/webhook](http://localhost:3000/webhook) — принимает события от Plane.

## 📦 Deployment

На Vercel:

- `.env` переменные добавляются через Dashboard.
- Эндпоинты `/webhook` и `/projects` работают как обычные Express-маршруты.

## 🛠️ Зависимости

- `express`
- `axios`
- `dotenv`
- `crypto` (встроен)
- `turndown` (для конвертации HTML → Markdown)

## 👨‍💻 Авторизация пользователей

Сопоставление ID пользователей в `webhook.js` — через `userMap`, обновляемый вручную.

---

## SQL для создания таблицы уведомлений в Supabase

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  issue_id text not null,
  issue_key text not null,
  title text not null,
  emoji text,
  status text not null default 'unread', -- unread, sent, read
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create index notifications_chat_id_idx on notifications(chat_id);
create index notifications_status_idx on notifications(status);
create index notifications_issue_id_idx on notifications(issue_id);
```

---
