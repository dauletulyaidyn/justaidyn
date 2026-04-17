import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8")

host = "89.207.254.135"
user = "root"
pwd = "Allahuakbar1!"

APP_PORT = 3000
MAIN_DOMAINS = ["justaidyn.com", "www.justaidyn.com"]
SUBDOMAINS = [
    "skillsminds.justaidyn.com",
    "nofacethinker.justaidyn.com",
    "courses.justaidyn.com",
    "apps.justaidyn.com",
    "games.justaidyn.com",
    "shop.justaidyn.com",
    "api.justaidyn.com",
]

PROXY_LOCATIONS = f"""
    location / {{
        proxy_pass http://127.0.0.1:{APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }}
"""


def run(cmd, timeout=60):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pwd, timeout=10)
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    client.close()
    return out or err


def build_server_block(server_names):
    names = " ".join(server_names) if isinstance(server_names, (list, tuple)) else server_names
    return f"""server {{
    listen 80;
    server_name {names};
{PROXY_LOCATIONS}
}}
"""


print("=== Creating nginx reverse proxy config for NestJS ===")

blocks = [build_server_block(MAIN_DOMAINS)]
for domain in SUBDOMAINS:
    blocks.append(build_server_block(domain))

nginx_conf = "\n".join(blocks)

run(f"cat > /etc/nginx/sites-available/justaidyn.com << 'EOF'\n{nginx_conf}\nEOF")

print(run("ln -sf /etc/nginx/sites-available/justaidyn.com /etc/nginx/sites-enabled/justaidyn.com"))
print(run("rm -f /etc/nginx/sites-enabled/default"))

print("\n=== Testing nginx configuration ===")
print(run("nginx -t 2>&1"))

print("\n=== Restarting nginx ===")
print(run("systemctl restart nginx && systemctl is-active nginx"))

print("\n=== Reverse proxy target ===")
print(f"All JustAidyn domains -> http://127.0.0.1:{APP_PORT}")
