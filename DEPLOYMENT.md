# SHA Production Deployment Guide

## Oracle Always Free VM Setup

This guide covers deploying SHA to an Oracle Cloud Always Free VM using Docker Compose.

### Prerequisites

- Ubuntu 22.04 or 24.04 on Oracle Always Free VM
- Public IP assigned
- Domain name pointing to VM
- Ports 80, 443 open in OCI Security Lists and VM firewall

### Initial Server Setup (one-time)

```bash
# SSH into VM
ssh ubuntu@your-vm-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Install certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx

# Create swap (helps with 1GB RAM limit)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/sha.git
cd sha

# Create production environment file
cp .env.production .env

# Edit .env with your values
nano .env
# REQUIRED:
# - NEXTAUTH_SECRET (generate: openssl rand -base64 32)
# - NEXTAUTH_URL (https://your-domain.com)
# - NEXT_PUBLIC_API_URL (https://your-domain.com)
# - RESEND_API_KEY
# - MEGA_EMAIL, MEGA_PASSWORD
# - MONGO_ROOT_PASSWORD, MONGO_APP_PASSWORD

# Create SSL directory
mkdir -p ssl
```

### Initial Build and Deployment

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Wait for MongoDB to initialize (~30s)
docker-compose logs mongodb

# Test app
curl http://localhost:3000/
```

### SSL Setup with Let's Encrypt

```bash
# Temporarily disable nginx to use certbot standalone
docker-compose stop nginx

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*

# Uncomment HTTPS sections in nginx.conf
nano nginx.conf
# Uncomment the HTTPS server block and redirect block
# Replace "your-domain.com" with actual domain

# Restart nginx
docker-compose up -d nginx

# Test HTTPS
curl https://your-domain.com/
```

### Auto-renewal of SSL Certificates

```bash
# Create renewal script
cat > ~/renew-ssl.sh << 'EOF'
#!/bin/bash
cd ~/sha
docker-compose stop nginx
sudo certbot renew --quiet
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*
docker-compose up -d nginx
EOF

chmod +x ~/renew-ssl.sh

# Add to crontab to run monthly
(crontab -l 2>/dev/null; echo "0 3 1 * * ~/renew-ssl.sh") | crontab -
```

### Monitoring and Maintenance

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f sha_app
docker-compose logs -f mongodb
docker-compose logs -f nginx

# Check container status
docker-compose ps

# Check resource usage
docker stats

# View MongoDB database
docker-compose exec mongodb mongosh -u admin -p

# Database backup
docker-compose exec mongodb mongodump --out /tmp/backup --uri="mongodb://admin:password@localhost:27017" --authenticationDatabase=admin

# Copy backup from container
docker cp sha_mongodb:/tmp/backup ./backup-$(date +%s)
```

### Deployments

#### Manual Deployment

```bash
cd ~/sha
git pull origin main
docker-compose build
docker-compose up -d
```

#### Automated Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Oracle VM

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to VM
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VM_IP }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/sha
            git pull origin main
            docker-compose build
            docker-compose up -d
            docker-compose logs --tail=20
```

Add secrets in GitHub repo settings:
- `VM_IP`: your-vm-public-ip
- `SSH_PRIVATE_KEY`: contents of your private SSH key

### Troubleshooting

**MongoDB won't start:**
```bash
docker-compose down
docker volume rm sha_mongodb_data
docker-compose up -d mongodb
```

**High memory usage:**
- Increase swap: `sudo fallocate -l 4G /swapfile`
- Consider MongoDB Atlas (managed, no local resource overhead)
- Scale down: reduce `worker_processes` in nginx.conf

**SSL certificate renewal failed:**
```bash
docker-compose stop nginx
sudo certbot renew --force-renewal -v
docker-compose up -d nginx
```

**Port 80/443 already in use:**
```bash
sudo netstat -tulpn | grep -E ':(80|443)'
sudo kill -9 <PID>
# Or update docker-compose.yml to use different ports
```

### Performance Tips

1. **Enable swap** for 1GB RAM stability
2. **Use MongoDB Atlas** if data grows large (free tier available)
3. **Monitor disk space**: `df -h`
4. **Monitor memory**: `free -h`
5. **Restart services periodically**: `docker-compose restart`

### Backup Strategy

```bash
# Automated daily backup
cat > ~/backup-mongodb.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/sha-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f ~/sha/docker-compose.yml exec -T mongodb mongodump --out /tmp/backup_$DATE --uri="mongodb://admin:$MONGO_ROOT_PASSWORD@localhost:27017" --authenticationDatabase=admin
docker cp sha_mongodb:/tmp/backup_$DATE $BACKUP_DIR/
rm -rf $BACKUP_DIR/backup_* -mtime +7 # Keep 7 days
EOF

chmod +x ~/backup-mongodb.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-mongodb.sh") | crontab -
```

### Resource Limits

The docker-compose.yml includes memory limits:
- MongoDB: 256M limit, 128M reservation
- SHA App: 512M limit, 256M reservation
- Nginx: 128M limit, 64M reservation

Adjust based on actual usage patterns.

### Next Steps

1. Set up monitoring (e.g., Uptime Robot for health checks)
2. Configure automated backups
3. Set up log aggregation
4. Plan scaling strategy as user base grows

For scaling beyond free tier, consider:
- Hetzner Cloud (~$3/month for small instance)
- DigitalOcean Droplets
- AWS Lightsail
- Linode Nanode
