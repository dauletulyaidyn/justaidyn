# 🚀 Настройка для Aidyn Dauletuly

## Твои социальные сети

| Платформа | URL | Тип публикации |
|-----------|-----|----------------|
| **TikTok** | [@dauletuly.aidyn](https://www.tiktok.com/@dauletuly.aidyn) | Контент |
| **WhatsApp Channel** | [Канал](https://chat.whatsapp.com/KQ9lqgydLS750BS4PX9fJL) | Контент |
| **WhatsApp Community** | [Сообщество](https://chat.whatsapp.com/BcHGNPw2ZuYFR5OC14hdWt) | Контент |
| **WhatsApp Status** | +7 776 9889889 | Статус |
| **YouTube** | [@justaidyncourses](https://www.youtube.com/@justaidyncourses) | Shorts |
| **Telegram Channel** | [@justaidyncourses](https://t.me/justaidyncourses) | Контент |
| **Telegram Status** | +7 776 9889889 | Статус |
| **Instagram** | [@dauletuly.justaidyn](https://www.instagram.com/dauletuly.justaidyn/) | Контент |
| **Instagram Stories** | [@dauletuly.justaidyn](https://www.instagram.com/dauletuly.justaidyn/) | Статус |
| **Threads** | [@dauletuly.justaidyn.daulet](https://www.threads.com/@dauletuly.justaidyn.daulet) | Контент |
| **Facebook** | [Профиль](https://web.facebook.com/profile.php?id=61583794767700) | Контент |
| **Facebook Reels** | [Профиль](https://web.facebook.com/profile.php?id=61583794767700) | Reels |
| **Facebook Status** | [Профиль](https://web.facebook.com/profile.php?id=61583794767700) | Статус |

---

## 📋 Пошаговая настройка

### Шаг 1: Установка (один раз)

```bash
cd social-publisher

# Установить зависимости
pip install -r requirements.txt

# Установить браузер для Playwright
playwright install chromium
```

### Шаг 2: Настройка окружения

Скопируй `.env.example` в `.env`:

```bash
copy .env.example .env
```

Заполни минимальные обязательные поля:

```env
# ============================================
# ОБЯЗАТЕЛЬНО: Браузерная автоматизация
# ============================================
USE_BROWSER_AUTOMATION=true
BROWSER_HEADLESS=false  # Оставь false для первого запуска

# Твой телефон для WhatsApp и Telegram
TELEGRAM_PHONE=+77769889889

# Данные для Instagram
INSTAGRAM_USERNAME=твой_username
INSTAGRAM_PASSWORD=твой_пароль

# Данные для Facebook
FACEBOOK_EMAIL=твоя_почта
FACEBOOK_PASSWORD=твой_пароль

# Данные для TikTok (опционально, если нет API)
TIKTOK_EMAIL=твоя_почта
TIKTOK_PASSWORD=твой_пароль
```

### Шаг 3: Настройка API (опционально, но рекомендуется)

#### Telegram (САМЫЙ ПРОСТОЙ - начни с него!)
1. Напиши [@BotFather](https://t.me/botfather)
2. Отправь `/newbot`
3. Придумай имя бота (например: "Aidyn Publisher Bot")
4. Получи токен вида: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. Добавь в `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=твой_токен
   TELEGRAM_CHANNEL_ID=@justaidyncourses
   ```

#### YouTube
1. Перейди в [Google Cloud Console](https://console.cloud.google.com/)
2. Создай проект → Включи "YouTube Data API v3"
3. Создай OAuth credentials
4. Получи client_id, client_secret
5. Пройди OAuth flow чтобы получить refresh_token

#### Meta (Instagram/Facebook/Threads)
1. [Meta Developers](https://developers.facebook.com/) → Создай приложение Business типа
2. Получи App ID и App Secret
3. Получи Access Token через Graph API Explorer
4. Нужен Instagram Business Account

### Шаг 4: Первый запуск (вход в аккаунты)

Запусти тестовую публикацию:

```bash
python publisher.py "Опубликуй 01_slogan_ru.png в Telegram"
```

**Что произойдет:**
1. Откроется браузер
2. Ты войдешь в аккаунт (один раз)
3. Сессия сохранится автоматически
4. Следующие запуски будут автоматическими

---

## 💡 Быстрые команды для тебя

### Опубликовать один баннер во все сети:
```bash
python publisher.py "Опубликуй 01_slogan_ru.png везде"
```

### Только основные платформы:
```bash
python publisher.py "Опубликуй 01_slogan_ru.png в Instagram, Telegram, TikTok и YouTube"
```

### Только статусы (Stories):
```bash
python publisher.py "Опубликуй 01_slogan_ru.png в Instagram Status, WhatsApp Status и Facebook Status"
```

### WhatsApp каналы:
```bash
python publisher.py "Опубликуй 01_slogan_ru.png в WhatsApp Channel и WhatsApp Community"
```

---

## 🔧 Решение проблем

### WhatsApp Web не открывается
- Убедись что телефон подключен к интернету
- На телефоне: WhatsApp → Настройки → Связанные устройства
- Отсканируй QR-код в браузере

### Instagram требует подтверждение
- Это нормально при первом входе
- Введи код из SMS/email в браузере
- Включи 2FA для безопасности

### Сессии не сохраняются
- Проверь что папка `browser_data/` создана
- Убедись что `BROWSER_HEADLESS=false` при первом входе
- Права на запись в папку проекта

---

## 📊 Что уже настроено

✅ Все URL твоих аккаунтов сохранены в `social_accounts.json`  
✅ Система знает твой телефон (+7 776 9889889)  
✅ Поддержка всех 13 типов публикаций  
✅ Автоматическое сохранение сессий  
✅ Повторный вход не требуется после первой настройки  

---

## 🎯 Следующие шаги

1. **Сейчас:** Установи зависимости (`pip install -r requirements.txt`)
2. **Сейчас:** Заполни `.env` файл минимальными данными
3. **Потом:** Настрой Telegram Bot (5 минут)
4. **Потом:** Протестируй публикацию
5. **Потом:** Настрой остальные API по желанию

**Готов помочь с каждым шагом!** 🚀
