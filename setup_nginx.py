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

COMMON_LOCATIONS = """
    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp|pdf)$ {
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
    server_name {names};

    root {root};
    index index.html;
{COMMON_LOCATIONS}
}}
"""


print("=== Creating nginx config for one-repo multi-subdomain setup ===")

blocks = [build_server_block(MAIN_DOMAINS, REPO_ROOT)]
for domain, folder in SUBDOMAIN_ROOTS.items():
    blocks.append(build_server_block(domain, f"{REPO_ROOT}/{folder}"))

nginx_conf = "\n".join(blocks)

run(f"cat > /etc/nginx/sites-available/justaidyn.com << 'EOF'\n{nginx_conf}\nEOF")

print(run("ln -sf /etc/nginx/sites-available/justaidyn.com /etc/nginx/sites-enabled/justaidyn.com"))
print(run("rm -f /etc/nginx/sites-enabled/default"))

print("\n=== Testing nginx configuration ===")
print(run("nginx -t 2>&1"))

print("\n=== Restarting nginx ===")
print(run("systemctl restart nginx && systemctl is-active nginx"))

print("\n=== One repo routing map ===")
print(f"Main site: {REPO_ROOT}")
for domain, folder in SUBDOMAIN_ROOTS.items():
    print(f"{domain} -> {REPO_ROOT}/{folder}")
