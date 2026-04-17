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

# Create Nginx configuration for justaidyn.com and subdomains
print("=== Creating Nginx config for justaidyn.com and subdomains ===")
COMMON_LOCATIONS = """
    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
"""

nginx_conf = f"""server {{
    listen 80;
    server_name justaidyn.com www.justaidyn.com;

    root /var/www/justaidyn.com;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name skillsminds.justaidyn.com;

    root /var/www/justaidyn.com/skillsminds;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name nofacethinker.justaidyn.com;

    root /var/www/justaidyn.com/nofacethinker;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name courses.justaidyn.com;

    root /var/www/justaidyn.com/courses;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name apps.justaidyn.com;

    root /var/www/justaidyn.com/apps;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name games.justaidyn.com;

    root /var/www/justaidyn.com/games;
    index index.html;
{COMMON_LOCATIONS}
}}

server {{
    listen 80;
    server_name shop.justaidyn.com;

    root /var/www/justaidyn.com/shop;
    index index.html;
{COMMON_LOCATIONS}
}}
"""

# Write Nginx config
run(f"cat > /etc/nginx/sites-available/justaidyn.com << 'EOF'\n{nginx_conf}\nEOF")

# Enable site
print(run("ln -sf /etc/nginx/sites-available/justaidyn.com /etc/nginx/sites-enabled/justaidyn.com"))
print(run("rm -f /etc/nginx/sites-enabled/default"))

# Test Nginx config
print("\n=== Testing Nginx configuration ===")
print(run("nginx -t 2>&1"))

# Restart Ngin
print("\n=== Restarting Nginx ===")
print(run("systemctl restart nginx && systemctl is-active nginx"))

# Check if site is accessible locally
print("\n=== Testing site locally ===")
print(run("curl -s -o /dev/null -w '%{http_code}' http://localhost"))

print("\n=== Nginx configured successfully ===")
print("Site root: /var/www/justaidyn.com")
print("Config: /etc/nginx/sites-available/justaidyn.com")
