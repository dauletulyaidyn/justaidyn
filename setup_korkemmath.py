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

# Create directory
print("=== Creating directory ===")
print(run("mkdir -p /var/www/korkemmath.kz"))

# Create Coming Soon page
html = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KorkemMath — Coming Soon</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #fff;
        }
        .container { text-align: center; padding: 2rem; }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(90deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p { color: #94a3b8; font-size: 1.2rem; }
        .badge {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.5rem 1.5rem;
            border: 1px solid #334155;
            border-radius: 9999px;
            font-size: 0.9rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>KorkemMath</h1>
        <p>Coming Soon</p>
        <span class="badge">Скоро здесь что-то будет</span>
    </div>
</body>
</html>
"""

print("\n=== Creating index.html ===")
run(f"cat > /var/www/korkemmath.kz/index.html << 'HTMLEOF'\n{html}\nHTMLEOF")
print(run("cat /var/www/korkemmath.kz/index.html | head -5"))

# Create Nginx config
nginx_conf = """server {
    listen 80;
    server_name korkemmath.kz www.korkemmath.kz;
    
    root /var/www/korkemmath.kz;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
"""

print("\n=== Creating Nginx config ===")
run(f"cat > /etc/nginx/sites-available/korkemmath.kz << 'EOF'\n{nginx_conf}\nEOF")

# Enable site
print(run("ln -sf /etc/nginx/sites-available/korkemmath.kz /etc/nginx/sites-enabled/korkemmath.kz"))

# Test and restart Nginx
print("\n=== Testing Nginx ===")
print(run("nginx -t 2>&1"))

print("\n=== Restarting Nginx ===")
print(run("systemctl restart nginx && systemctl is-active nginx"))

# Verify both sites
print("\n=== Verifying ===")
print(f"justaidyn.com: {run('curl -s -o /dev/null -w \"%{http_code}\" -H \"Host: justaidyn.com\" http://localhost')}")
print(f"korkemmath.kz: {run('curl -s -o /dev/null -w \"%{http_code}\" -H \"Host: korkemmath.kz\" http://localhost')}")

print("\n✅ Both sites configured!")
