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

# Check if this is a Next.js project or static HTML
print("=== Checking project structure ===")
print(run("cat /var/www/justaidyn.com/package.json 2>/dev/null | head -30 || echo 'NO_PACKAGE_JSON'"))

# Check if there's a .env or .env.local
print("\n=== Checking for .env files ===")
print(run("ls -la /var/www/justaidyn.com/.env* 2>/dev/null || echo 'NO_ENV_FILES'"))

# Check if it's a static site (HTML files)
print("\n=== Checking for index.html ===")
print(run("ls -la /var/www/justaidyn.com/index.html 2>/dev/null || echo 'NO_INDEX_HTML'"))

# Check if there's .next folder (Next.js build)
print("\n=== Checking for Next.js build ===")
print(run("ls -la /var/www/justaidyn.com/.next 2>/dev/null || echo 'NO_NEXT_BUILD'"))

# Install dependencies and build if it's Next.js
print("\n=== Installing npm dependencies ===")
print(run("cd /var/www/justaidyn.com && npm install 2>&1 | tail -20", timeout=180))

# Check package.json scripts
print("\n=== Checking build scripts ===")
print(run("cat /var/www/justaidyn.com/package.json | grep -A 10 '\"scripts\"' || echo 'NO_SCRIPTS'"))
