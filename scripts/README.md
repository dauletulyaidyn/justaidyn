# Email -> Desktop TXT

Скрипт забирает письма через IMAP и сохраняет на рабочий стол те, где в теме есть "CV-Portfolio".

1. Убедитесь, что включен IMAP в вашем почтовом сервисе и есть пароль приложения (например, для Gmail).
2. Задайте переменные окружения (пример для PowerShell):

```powershell
$env:IMAP_HOST = "imap.gmail.com"
$env:IMAP_PORT = "993"
$env:IMAP_USER = "you@example.com"
$env:IMAP_PASS = "app-password"
$env:IMAP_MAILBOX = "INBOX"
$env:SUBJECT_KEYWORD = "CV-Portfolio"
$env:OUTPUT_DIR = "$env:USERPROFILE\Desktop"
$env:OVERWRITE = "1"
$env:MARK_SEEN = "0"
python scripts\email_to_desktop.py
```

3. Для Outlook/Office365 используйте `IMAP_HOST = "outlook.office365.com"`.
4. Если нужно запускать по расписанию, добавьте команду в Task Scheduler.
