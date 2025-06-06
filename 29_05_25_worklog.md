# TODO Summary – 2025-05-29

## ✅ Сделано:
- 🔧 Реализован `projectService.js` с функциями:
  - `loadProjects()` — загружает список проектов и сохраняет их в `Map<id → name>`.
  - `getProjectNameById(id)` — возвращает название проекта по ID.
- 🧩 В `webhook.js` интегрирован `getProjectNameById(...)` для вывода названия проекта в сообщении.
- 🚀 `index.js` был обновлён, чтобы вызывать `loadProjects()` при старте сервера до `app.listen`.

---

## 🧠 Что не сработало (и надо проверить):
1. **Проверь, что `loadProjects()` реально вызывается.**  
   Добавь `console.log(...)` в `projectService.js`, чтобы убедиться, что мапа действительно заполняется.

2. **Убедись, что `res.data.results` — массив.**  
   Иногда Plane API возвращает просто `res.data`, а не `res.data.results`.

3. **Проверь, есть ли `project_id` в теле вебхука.**  
   Если он отсутствует — `getProjectNameById` будет получать `undefined`.

---

## ✅ Что нужно доделать:
- [ ] Добавить **лог** при загрузке и вывод содержимого `projectMap` для отладки.
- [ ] Убедиться, что `project_id` из вебхука передаётся правильно.
- [ ] Обработать случай, если проект не найден — чтобы логировать это, но не падать.
- [ ] При необходимости — добавить **периодическое обновление проектов** (например, каждые 10 мин).
