import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8")

host = "89.207.254.135"
user = "root"
pwd = "Allahuakbar1!"

REPO_ROOT = "/var/www/justaidyn.com"
NODE_APP_PORT = 3000
SERVICE_NAME = "justaidyn-nest"


def run(cmd, timeout=180):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pwd, timeout=10)
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    client.close()
    return out or err


service_file = f"""[Unit]
Description=JustAidyn NestJS Platform
After=network.target

[Service]
Type=simple
WorkingDirectory={REPO_ROOT}
Environment=NODE_ENV=production
Environment=PORT={NODE_APP_PORT}
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
"""

print("=== Installing JustAidyn NestJS systemd service ===")
run(f"cat > /etc/systemd/system/{SERVICE_NAME}.service << 'EOF'\n{service_file}\nEOF")

print(run(f"cd {REPO_ROOT} && PUPPETEER_SKIP_DOWNLOAD=1 npm install --include=dev --ignore-scripts", timeout=600))
print(run(f"cd {REPO_ROOT} && npm run build", timeout=600))
print(run("systemctl daemon-reload"))
print(run(f"systemctl enable {SERVICE_NAME}"))
print(run(f"systemctl restart {SERVICE_NAME} && systemctl is-active {SERVICE_NAME}"))
print(run(f"curl -s http://127.0.0.1:{NODE_APP_PORT}/health"))
