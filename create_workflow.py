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

# Get server host key for known_hosts
print("=== Getting server host key ===")
host_key = run("ssh-keyscan -H 89.207.254.135 2>/dev/null")
print(host_key[:100] + "...")

# Create GitHub Actions workflow
workflow = """name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: 89.207.254.135
          username: root
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /var/www/justaidyn.com
            git pull origin main
            echo "Deployment complete!"
"""

# Write workflow to local repo
workflow_path = "C:\\Users\\JustAidyn\\Desktop\\justaidyn.com\\.github\\workflows\\deploy.yml"
import os
os.makedirs(os.path.dirname(workflow_path), exist_ok=True)

with open(workflow_path, 'w', encoding='utf-8') as f:
    f.write(workflow)

print(f"\n=== GitHub Actions workflow created ===")
print(f"Location: {workflow_path}")
print("\nWorkflow content:")
print(workflow)
