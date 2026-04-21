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

# Clone repo via SSH
print("=== Cloning repo ===")
print(run("rm -rf /var/www/justaidyn.com && git clone git@github.com:dauletulyaidyn/justaidyn.git /var/www/justaidyn.com 2>&1", timeout=120))

# Verify clone
print("\n=== Repo cloned successfully ===")
print(run("ls -la /var/www/justaidyn.com/ | head -20"))

# Install PostgreSQL
print("\n=== Installing PostgreSQL ===")
print(run("DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib 2>&1 | tail -20", timeout=180))

# Start and enable PostgreSQL
print("\n=== Starting PostgreSQL ===")
print(run("systemctl enable postgresql && systemctl start postgresql && systemctl is-active postgresql"))

# Check PostgreSQL version and status
print("\n=== PostgreSQL Status ===")
print(run("pg_lsclusters"))
print(run("su - postgres -c 'psql --version'"))
