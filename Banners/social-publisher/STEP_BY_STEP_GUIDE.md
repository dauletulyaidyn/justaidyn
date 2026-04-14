# 📋 Пошаговая инструкция публикации во все соцсети

## ✅ Шаг 1: Telegram Channel (ГОТОВО)
**Статус:** ✅ Уже работает!
**Результат:** Баннер опубликован в @justaidyncourses

---

## ⏳ Шаг 2: WhatsApp Status
**Действие:** Открыть WhatsApp Web в браузере

### Вариант A: Через .bat файл (рекомендуется)
1. Открой папку `social-publisher` в проводнике
2. Найди файл `Setup_WhatsApp.bat`
3. **Дважды кликни на него**
4. Откроется браузер с QR-кодом
5. На телефоне: WhatsApp → Настройки → Связанные устройства → Сканировать
6. Нажми любую клавишу в окне команд
7. ✅ Готово!

### Вариант B: Через командную строку Windows
1. Нажми `Win + R`
2. Введи: `cmd`
3. Нажми Enter
4. Вставь команды:
```bash
cd "C:\Users\JustAidyn\Desktop\No face thinker and NOESIS projects\CV-Portfolio\Banners\social-publisher"
python whatsapp_manual.py
```

**После завершения этого шага скажи мне:** "WhatsApp настроен"

---

## ⏳ Шаг 3: Facebook
**Действие:** Войти в Facebook через браузер

1. Запусти:
```bash
cd social-publisher
python -c "from browser_automation import FacebookWebAutomation; import asyncio; f = FacebookWebAutomation('aidyn.daulet@gmail.com', 'Allahuakbar1!', False); asyncio.run(f.init_browser()); asyncio.run(f.login()); input('Press Enter when done...'); asyncio.run(f.close_browser())"
```

2. В открывшемся браузере войди в Facebook вручную
3. Если появится 2FA - введи код
4. Нажми Enter в терминале
5. ✅ Готово!

**После завершения скажи:** "Facebook настроен"

---

## ⏳ Шаг 4: Instagram
**Действие:** Войти в Instagram через Facebook

1. Запусти:
```bash
cd social-publisher
python -c "from browser_automation import InstagramWebAutomation; import asyncio; i = InstagramWebAutomation('aidyn.daulet@gmail.com', 'Allahuakbar1!', False); asyncio.run(i.init_browser()); asyncio.run(i.login()); input('Press Enter...'); asyncio.run(i.close_browser())"
```

2. Войди через Facebook (как обычно)
3. Нажми Enter
4. ✅ Готово!

**После завершения скажи:** "Instagram настроен"

---

## ⏳ Шаг 5: TikTok
**Действие:** Установить ffmpeg для конвертации видео

1. Скачай ffmpeg: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Распакуй в `C:\ffmpeg`
3. Добавь в PATH:
   - Win + R → `sysdm.cpl` → Enter
   - Дополнительно → Переменные среды
   - Path → Изменить → Создать
   - Добавь: `C:\ffmpeg\bin`
   - OK → OK

4. Проверь: открой новый cmd и введи `ffmpeg -version`

**После завершения скажи:** "ffmpeg установлен"

---

## ⏳ Шаг 6: YouTube
**Действие:** Получить API ключи

1. Перейди: https://console.cloud.google.com/
2. Войди в Google аккаунт
3. Создай проект → Включи "YouTube Data API v3"
4. Создай OAuth 2.0 credentials
5. Скачай client_secret.json
6. Получи refresh_token (запусти OAuth flow)

**После завершения скажи:** "YouTube API готов"

---

## ⏳ Шаг 7: Threads
**Действие:** Настроить через Meta

1. Убедись что Instagram аккаунт Business/Creator
2. Meta Developers → создай приложение
3. Получи доступ к Threads API
4. Настрой токены

**После завершения скажи:** "Threads настроен"

---

## 🚀 Финальный шаг: Публикация!

После настройки всех платформ:

```bash
cd social-publisher
python publish_now.py
```

Баннер опубликуется во все настроенные соцсети автоматически!

---

## 📊 Прогресс

| # | Платформа | Статус | Действие |
|---|-----------|--------|----------|
| 1 | Telegram | ✅ Готово | - |
| 2 | WhatsApp | ⏳ | Запустить Setup_WhatsApp.bat |
| 3 | Facebook | ⏳ | Войти через браузер |
| 4 | Instagram | ⏳ | Войти через Facebook |
| 5 | TikTok | ⏳ | Установить ffmpeg |
| 6 | YouTube | ⏳ | Получить API |
| 7 | Threads | ⏳ | Настроить Meta |

**Скажи мне с какого шага начать или что уже сделано!**
