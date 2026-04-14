import imaplib
import os
import re
from email import message_from_bytes
from email.header import decode_header, make_header
from pathlib import Path
import html as html_lib


def get_env(name, default=None, required=False):
    value = os.environ.get(name, default)
    if required and not value:
        raise SystemExit(f"Missing env var: {name}")
    return value


def sanitize_filename(name, fallback):
    name = re.sub(r"[\x00-\x1f]", "_", name)
    name = re.sub(r"[<>:\"/\\|?*]", "_", name)
    name = name.strip().strip(".")
    if not name:
        name = fallback
    if len(name) > 180:
        name = name[:180].rstrip()
    return name


def decode_part(part):
    payload = part.get_payload(decode=True)
    if payload is None:
        payload = part.get_payload()
        return payload if isinstance(payload, str) else ""
    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="replace")
    except LookupError:
        return payload.decode("utf-8", errors="replace")


def strip_html(text):
    text = re.sub(r"(?is)<(script|style).*?>.*?</\\1>", "", text)
    text = re.sub(r"(?s)<[^>]+>", "", text)
    return html_lib.unescape(text)


def extract_text(msg):
    if msg.is_multipart():
        plain_parts = []
        html_part = None
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = (part.get("Content-Disposition") or "").lower()
            if "attachment" in disposition:
                continue
            if content_type == "text/plain":
                plain_parts.append(decode_part(part))
            elif content_type == "text/html" and html_part is None:
                html_part = decode_part(part)
        if plain_parts:
            return "\n\n".join(p.strip() for p in plain_parts if p)
        if html_part:
            return strip_html(html_part).strip()
        return ""
    if msg.get_content_type() == "text/html":
        return strip_html(decode_part(msg)).strip()
    return decode_part(msg).strip()


def main():
    subject_keyword = os.environ.get("SUBJECT_KEYWORD", "CV-Portfolio")

    imap_host = get_env("IMAP_HOST", required=True)
    imap_user = get_env("IMAP_USER", required=True)
    imap_pass = get_env("IMAP_PASS", required=True)
    imap_port = int(os.environ.get("IMAP_PORT", "993"))
    imap_mailbox = os.environ.get("IMAP_MAILBOX", "INBOX")

    output_dir = Path(
        os.environ.get("OUTPUT_DIR", str(Path.home() / "Desktop"))
    ).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)

    overwrite = os.environ.get("OVERWRITE", "1") == "1"
    mark_seen = os.environ.get("MARK_SEEN", "0") == "1"

    imap = imaplib.IMAP4_SSL(imap_host, imap_port)
    imap.login(imap_user, imap_pass)
    imap.select(imap_mailbox)

    status, data = imap.search(None, f'(SUBJECT "{subject_keyword}")')
    if status != "OK":
        raise SystemExit("IMAP search failed")

    message_ids = data[0].split()
    saved = 0

    for msg_id in message_ids:
        status, msg_data = imap.fetch(msg_id, "(RFC822)")
        if status != "OK" or not msg_data or not msg_data[0]:
            continue
        raw = msg_data[0][1]
        msg = message_from_bytes(raw)

        subject = str(make_header(decode_header(msg.get("Subject", ""))))
        if subject_keyword.lower() not in subject.lower():
            continue

        safe_subject = sanitize_filename(subject, subject_keyword)
        file_path = output_dir / f"{safe_subject}.txt"

        if file_path.exists() and not overwrite:
            continue

        body = extract_text(msg)
        content = (
            f"Subject: {subject}\n"
            f"From: {msg.get('From', '')}\n"
            f"Date: {msg.get('Date', '')}\n\n"
            f"{body}\n"
        )

        with file_path.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)

        if mark_seen:
            imap.store(msg_id, "+FLAGS", "\\Seen")

        saved += 1

    imap.logout()
    print(f"Saved {saved} message(s) to {output_dir}")


if __name__ == "__main__":
    main()
