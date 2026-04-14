# 📱 Social Media Publisher

Автоматизированная система публикации контента в социальные сети.

## 🎯 Поддерживаемые платформы

| Платформа | Тип публикации | API | Браузер |
|-----------|---------------|-----|---------|
| TikTok | Контент (видео) | ✅ | ✅ |
| WhatsApp Channel | Контент | ✅ | ✅ |
| WhatsApp Community | Контент | ✅ | ✅ |
| WhatsApp Status | Статус | ❌ | ✅ |
| YouTube | Shorts | ✅ | ❌ |
| Telegram Channel | Контент | ✅ | ✅ |
| Telegram | Статус (Stories) | ❌ | ✅ |
| Instagram | Контент | ✅ | ⚠️ |
| Instagram | Статус (Stories) | ⚠️ | ✅ |
| Threads | Контент | ✅ | ❌ |
| Facebook | Контент | ✅ | ✅ |
| Facebook | Reels | ✅ | ✅ |
| Facebook | Статус (Stories) | ⚠️ | ✅ |

**Легенда:**
- ✅ Полностью поддерживается
- ⚠️ Частичная поддержка или ограничения
- ❌ Не поддерживается

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd social-publisher
pip install -r requirements.txt
```

### 2. Настройка API ключей

Скопируйте `.env.example` в `.env` и заполните:

```bash
copy .env.example .env
```

### 3. Запуск

```bash
# Интерактивный режим
python publisher.py

# Публикация через команду
python publisher.py "Опубликуй баннер 01_slogan_ru.png в Instagram и Telegram"
```

## 📋 Получение API ключей

### Telegram (самый простой)
1. Напишите [@BotFather](https://t.me/botfather) в Telegram
2. Создайте нового бота: `/newbot`
3. Получите токен вида `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
4. Добавьте бота в канал администратором
5. Узнайте ID канала (начинается с `-100`)

### Meta (Instagram + Facebook + Threads)
1. Зарегистрируйтесь на [Meta for Developers](https://developers.facebook.com/)
2. Создайте приложение типа "Business"
3. Получите App ID и App Secret
4. Получите Access Token через [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
5. Убедитесь что Instagram аккаунт подключен к Business Manager

### YouTube
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект
3. Включите YouTube Data API v3
4. Создайте OAuth 2.0 credentials
5. Получите refresh token через OAuth flow

### TikTok
1. Зарегистрируйтесь на [TikTok for Developers](https://developers.tiktok.com/)
2. Создайте приложение
3. Пройдите верификацию бизнеса
4. Получите Access Token и Open ID

### WhatsApp Business API
1. Используйте [Meta Business Platform](https://business.facebook.com/)
2. Или провайдера: [360dialog](https://360dialog.com/), [Twilio](https://twilio.com/)
3. Получите Phone Number ID и Access Token

## 💬 Формат команд

### Основные команды

```
Опубликуй баннер 01_slogan_ru.png в Instagram и Telegram
Опубликуй 02_ai_ne_chat_ru.png в TikTok, YouTube и Instagram
Опубликуй 03_bez_magii_kk.png везде
Опубликуй файл в Instagram Stories с текстом "Новый пост!"
```

### Синонимы платформ

- **Instagram**: `instagram`, `инстаграм`, `инста`, `ig`
- **Instagram Stories**: `instagram stories`, `инстаграм статус`, `сторис`
- **Telegram**: `telegram`, `телеграм`, `тг`, `telegram channel`
- **YouTube**: `youtube`, `ютуб`, `shorts`, `шортс`
- **TikTok**: `tiktok`, `тикток`, `тик-ток`
- **Facebook**: `facebook`, `фейсбук`, `фб`, `fb`
- **Facebook Reels**: `facebook reels`, `фейсбук рилс`
- **Threads**: `threads`, `тредс`
- **WhatsApp**: `whatsapp`, `ватсап`

## 📁 Структура проекта

```
social-publisher/
├── browser_automation/      # Браузерная автоматизация (Playwright)
│   ├── base_browser.py      # Базовый класс браузера
│   ├── whatsapp_web.py      # WhatsApp Web
│   ├── instagram_web.py     # Instagram Web
│   ├── facebook_web.py      # Facebook Web
│   ├── telegram_web.py      # Telegram Web
│   ├── tiktok_web.py        # TikTok Web
│   └── __init__.py
├── config/
│   └── __init__.py          # Конфигурация
├── publishers/              # API публикаторы
│   ├── base.py              # Базовый класс
│   ├── telegram.py          # Telegram API
│   ├── instagram.py         # Instagram API
│   ├── facebook.py          # Facebook API
│   ├── youtube.py           # YouTube API
│   ├── tiktok.py            # TikTok API
│   ├── whatsapp.py          # WhatsApp API
│   ├── threads.py           # Threads API
│   └── __init__.py
├── utils/
│   ├── command_parser.py    # Парсер команд
│   └── __init__.py
├── publisher.py             # Главный скрипт
├── .env.example             # Шаблон конфигурации
├── requirements.txt         # Зависимости
└── README.md                # Документация
```

## 🌐 Браузерная автоматизация (Playwright)

Для платформ без официального API (WhatsApp Status, Instagram Stories) система использует **Playwright** - инструмент для автоматизации браузера.

### Как это работает:
1. При первом запуске откроется браузер для входа
2. Введите логин/пароль или отсканируйте QR-код
3. Сессия сохраняется автоматически
4. При следующих запусках вход происходит автоматически

### Настройка браузерной автоматизации:

В файле `.env` добавьте:
```env
# Включить браузерную автоматизацию
USE_BROWSER_AUTOMATION=true

# Режим браузера: false = видимый (для первого входа), true = скрытый
BROWSER_HEADLESS=false

# Учетные данные для входа
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password

FACEBOOK_EMAIL=your_email
FACEBOOK_PASSWORD=your_password

TIKTOK_EMAIL=your_email
TIKTOK_PASSWORD=your_password

TELEGRAM_PHONE=+77001234567
```

### Первоначальная настройка (один раз):

1. Установите Playwright:
   ```bash
   pip install playwright
   playwright install chromium
   ```

2. Запустите с видимым браузером (`BROWSER_HEADLESS=false`)

3. Для WhatsApp Web:
   - Откроется браузер с QR-кодом
   - Отсканируйте его телефоном
   - Сессия сохранится автоматически

4. Для Instagram/Facebook:
   - Введите логин/пароль в браузере
   - Если появится 2FA - введите код
   - Сессия сохранится автоматически

### Особенности:
- **WhatsApp Status** - работает только через браузер (нет API)
- **Instagram Stories** - более стабильно через браузер
- **Facebook Stories/Reels** - работает через браузер если нет API
- Сессии сохраняются в папке `browser_data/`
- Не требуется повторный вход после первой настройки

## ⚠️ Ограничения

1. **WhatsApp Status** - работает только через браузер (нет API)
2. **TikTok API** - требует бизнес-верификации, доступна браузерная версия
3. **YouTube** - только видео (не изображения) - баннеры нужно конвертировать
4. **Скорость** - браузерная автоматизация медленнее API (~10-30 сек на платформу)

## 🔧 Требования

- Python 3.8+
- aiohttp
- python-dotenv
- Pillow (для обработки изображений)
- playwright (для браузерной автоматизации)
- google-api-python-client (для YouTube API)
- Установка Playwright: `playwright install chromium`

## 📝 Лицензия

MIT License
