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
    listen [::]:80;
    server_name {names};
{PROXY_LOCATIONS}
}}
"""


print("=== Updating nginx config for SSL with NestJS reverse proxy ===")

blocks = [build_server_block(MAIN_DOMAINS)]
for domain in SUBDOMAINS:
    blocks.append(build_server_block(domain))

justaidyn_conf = "\n".join(blocks)

korkemmath_conf = """server {
    listen 80;
    listen [::]:80;
    server_name korkemmath.kz www.korkemmath.kz;

    root /var/www/korkemmath.kz;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
"""

run(f"cat > /etc/nginx/sites-available/justaidyn.com << 'EOF'\n{justaidyn_conf}\nEOF")
run(f"cat > /etc/nginx/sites-available/korkemmath.kz << 'EOF'\n{korkemmath_conf}\nEOF")

print(run("ln -sf /etc/nginx/sites-available/justaidyn.com /etc/nginx/sites-enabled/justaidyn.com"))
print(run("ln -sf /etc/nginx/sites-available/korkemmath.kz /etc/nginx/sites-enabled/korkemmath.kz"))

print("\n=== Testing nginx ===")
print(run("nginx -t 2>&1"))
print(run("systemctl restart nginx"))

justaidyn_cert_domains = " ".join(f"-d {domain}" for domain in MAIN_DOMAINS + SUBDOMAINS)

print("\n=== Running Certbot for justaidyn.com ===")
print(
    run(
        f"certbot --nginx --expand {justaidyn_cert_domains} "
        "--non-interactive --agree-tos --email dauletulyaidyn@gmail.com --redirect 2>&1",
        timeout=120,
    )
)

print("\n=== Running Certbot for korkemmath.kz ===")
print(
    run(
        "certbot --nginx -d korkemmath.kz -d www.korkemmath.kz "
        "--non-interactive --agree-tos --email dauletulyaidyn@gmail.com --redirect 2>&1",
        timeout=120,
    )
)

print("\n=== Reverse proxy target ===")
print(f"All JustAidyn domains -> http://127.0.0.1:{APP_PORT}")

print("\n=== Verifying HTTPS ===")
print(run("curl -s -o /dev/null -w 'justaidyn.com: %{http_code} (HTTPS)' https://justaidyn.com"))
print(run("curl -s -o /dev/null -w 'korkemmath.kz: %{http_code} (HTTPS)' https://korkemmath.kz"))
