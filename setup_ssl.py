import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8')

host = "89.207.254.135"
user = "root"
pwd = "Allahuakbar1!"

def run(cmd, timeout=60):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pwd, timeout=10)
    stdin, stdout, stderr = c.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    c.close()
    return out or err

# Update Nginx configs to support SSL (main domain + subdomains)
print("=== Updating Nginx configs for SSL ===")

COMMON_LOCATIONS = r"""
    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
"""

justaidyn_conf = f"""server {{
    listen 80;
    listen [::]:80;
    server_name justaidyn.com www.justaidyn.com;

    root /var/www/justaidyn.com;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name skillsminds.justaidyn.com;

    root /var/www/justaidyn.com/skillsminds;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name nofacethinker.justaidyn.com;

    root /var/www/justaidyn.com/nofacethinker;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name courses.justaidyn.com;

    root /var/www/justaidyn.com/courses;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name apps.justaidyn.com;

    root /var/www/justaidyn.com/apps;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name games.justaidyn.com;

    root /var/www/justaidyn.com/games;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name shop.justaidyn.com;

    root /var/www/justaidyn.com/shop;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    listen [::]:80;
    server_name api.justaidyn.com;

    root /var/www/justaidyn.com/api;
    index index.html;
{COMMON_LOCATIONS}
}}
"""

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

# Test config
print("\n=== Testing Nginx ===")
print(run("nginx -t 2>&1"))
print(run("systemctl restart nginx"))

# Run certbot
print("\n=== Running Certbot for justaidyn.com ===")
print(run("certbot --nginx --expand -d justaidyn.com -d www.justaidyn.com -d skillsminds.justaidyn.com -d nofacethinker.justaidyn.com -d courses.justaidyn.com -d apps.justaidyn.com -d games.justaidyn.com -d shop.justaidyn.com -d api.justaidyn.com --non-interactive --agree-tos --email dauletulyaidyn@gmail.com --redirect 2>&1", timeout=120))

print("\n=== Running Certbot for korkemmath.kz ===")
print(run("certbot --nginx -d korkemmath.kz -d www.korkemmath.kz --non-interactive --agree-tos --email dauletulyaidyn@gmail.com --redirect 2>&1", timeout=120))

# Verify SSL
print("\n=== Verifying SSL ===")
print(run("curl -s -o /dev/null -w 'justaidyn.com: %{http_code} (HTTPS)' https://justaidyn.com"))
print(run("curl -s -o /dev/null -w 'korkemmath.kz: %{http_code} (HTTPS)' https://korkemmath.kz"))

print("\n✅ SSL certificates installed!")
