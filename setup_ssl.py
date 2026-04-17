import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8")

host = "89.207.254.135"
user = "root"
pwd = "Allahuakbar1!"

REPO_ROOT = "/var/www/justaidyn.com"
MAIN_DOMAINS = ["justaidyn.com", "www.justaidyn.com"]
SUBDOMAIN_ROOTS = {
    "skillsminds.justaidyn.com": "skillsminds",
    "nofacethinker.justaidyn.com": "nofacethinker",
    "courses.justaidyn.com": "courses",
    "apps.justaidyn.com": "apps",
    "games.justaidyn.com": "games",
    "shop.justaidyn.com": "shop",
    "api.justaidyn.com": "api",
}

COMMON_LOCATIONS = r"""
    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
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


def build_server_block(server_names, root):
    names = " ".join(server_names) if isinstance(server_names, (list, tuple)) else server_names
    return f"""server {{
    listen 80;
    listen [::]:80;
    server_name {names};

    root {root};
    index index.html;
{COMMON_LOCATIONS}
}}
"""


print("=== Updating nginx config for SSL in one-repo multi-subdomain setup ===")

blocks = [build_server_block(MAIN_DOMAINS, REPO_ROOT)]
for domain, folder in SUBDOMAIN_ROOTS.items():
    blocks.append(build_server_block(domain, f"{REPO_ROOT}/{folder}"))

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

justaidyn_cert_domains = " ".join(f"-d {domain}" for domain in MAIN_DOMAINS + list(SUBDOMAIN_ROOTS.keys()))

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

print("\n=== One repo routing map ===")
print(f"Main site: {REPO_ROOT}")
for domain, folder in SUBDOMAIN_ROOTS.items():
    print(f"{domain} -> {REPO_ROOT}/{folder}")

print("\n=== Verifying HTTPS ===")
print(run("curl -s -o /dev/null -w 'justaidyn.com: %{http_code} (HTTPS)' https://justaidyn.com"))
print(run("curl -s -o /dev/null -w 'korkemmath.kz: %{http_code} (HTTPS)' https://korkemmath.kz"))
