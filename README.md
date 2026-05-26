# ПДД Грузия — Mini App / PWA

Приложение для подготовки к теоретическому экзамену на права в Грузии. Категория B, русский язык.

- **914 билетов** из открытого банка, спарсенных с artdrive.ge
- **Человеческие пояснения** по всем 31 теме (правильный + разбор каждого неправильного + блок «почему правило работает именно так»)
- **3 режима**: Теория (по темам), Практика (30 случайных, без лимита ошибок), Экзамен (30 случайных, 30 мин, до 5 ошибок — формат после реформы мая 2026)
- **Telegram Mini App**: интегрированы BackButton, MainButton, Haptic, корректные заголовки
- **PWA** офлайн-first: после первой загрузки работает без сети

## Запуск локально

```bash
python3 -m http.server 8765
# открыть http://localhost:8765
```

## Деплой на GitHub Pages

### Шаг 1. Инициализация git и пуш на GitHub

```bash
cd /Users/din/PDDGE
git init -b main
git add .
git commit -m "Initial: PDD Georgia Mini App"

# Создайте репозиторий на github.com (public). Получите URL вида:
# git@github.com:USERNAME/pddge.git  или  https://github.com/USERNAME/pddge.git

git remote add origin https://github.com/USERNAME/pddge.git
git push -u origin main
```

### Шаг 2. Включить Pages

1. На github.com → ваш репо → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `/ (root)` → **Save**
4. Подождите 1–2 минуты, GitHub соберёт страницу
5. URL будет: `https://USERNAME.github.io/pddge/`

> Проверьте, что страница открывается в обычном браузере и показывает «914 вопросов в банке».

### Шаг 3. Привязать к существующему боту через @BotFather

В Telegram откройте чат с [@BotFather](https://t.me/BotFather):

```
/mybots
→ выберите вашего бота
→ Bot Settings
→ Menu Button
→ Configure Menu Button
   – Текст кнопки: «📚 ПДД Грузия»
   – URL: https://USERNAME.github.io/pddge/
```

Альтернатива — отдельная Mini App (тогда её можно открывать прямой ссылкой):

```
/newapp
→ выберите бота
→ Title: ПДД Грузия
→ Description: Подготовка к экзамену на права в Грузии
→ Photo: (загрузите public/icon-512.png)
→ Demo GIF: skip
→ Web App URL: https://USERNAME.github.io/pddge/
→ Short name: pddge
```

После создания BotFather даст ссылку вида `t.me/your_bot/pddge` — это прямой вход в Mini App.

### Шаг 4. Тест

1. В Telegram откройте чат с вашим ботом
2. Нажмите кнопку меню (синяя слева от поля ввода) — Mini App откроется на весь экран
3. Проверьте: тёмный фон, кнопка «Назад» (стрелка слева вверху), вибрация при ответах, кнопка «Далее» внизу экрана

## Структура

```
PDDGE/
├── index.html              # точка входа
├── manifest.webmanifest    # PWA-манифест
├── sw.js                   # Service Worker (кэш для офлайн)
├── public/
│   ├── icon.svg            # иконка приложения
│   ├── icon-192.png, icon-512.png
│   └── images/             # 524 картинки билетов (66 МБ)
├── data/
│   └── questions.json      # 914 вопросов с метаданными
├── src/
│   ├── app.js              # точка входа JS, роутер
│   ├── data.js             # загрузка вопросов, темы
│   ├── store.js            # localStorage прогресс
│   ├── render.js           # утилиты рендера
│   ├── tg.js               # Telegram WebApp SDK интеграция
│   ├── styles.css          # тёмная тема
│   ├── views/              # экраны (home / theory / ticket / practice / exam / result)
│   └── explanations/       # 31 модуль пояснений + index.js
└── scripts/
    ├── topics.py           # 31 тема (canonical mapping)
    └── scrape.py           # парсер artdrive.ge (для пополнения)
```

## Обновление контента

Чтобы обновить базу вопросов:
```bash
python3 scripts/scrape.py --all
git add data/ public/images/
git commit -m "update questions"
git push
```

GH Pages автоматически пересоберёт сайт через 1–2 минуты.

## Лицензия

Код — MIT. Контент вопросов принадлежит artdrive.ge / sa-ts.ge.
