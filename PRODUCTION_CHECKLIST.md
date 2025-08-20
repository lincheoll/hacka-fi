# HackaFi Production Deployment Checklist

Use this checklist to ensure a secure and reliable production deployment.

## Pre-Deployment Security Checklist

### Environment Configuration

- [ ] **Environment Variables**: Copy `.env.production.example` to `.env.production` and update all values
- [ ] **JWT Secret**: Generate a secure JWT secret (minimum 32 characters)
- [ ] **Database Credentials**: Use strong, unique passwords for database access
- [ ] **Admin Wallet**: Configure admin wallet address for system management
- [ ] **RPC Configuration**: Set production RPC endpoints (Kaia mainnet)

### Smart Contract Deployment

- [ ] **Contract Addresses**: Deploy contracts to mainnet and update environment variables
- [ ] **Private Keys**: Secure storage of deployment private keys (use environment variables, never commit)
- [ ] **Contract Verification**: Verify deployed contracts on block explorer
- [ ] **Contract Testing**: Run comprehensive tests on deployed contracts

### Database Security

- [ ] **PostgreSQL Configuration**:
  - Use strong database passwords
  - Limit database connections
  - Enable SSL connections in production
- [ ] **Database Backups**: Set up automated backup strategy
- [ ] **Migration Testing**: Test all database migrations on staging environment

### Infrastructure Security

- [ ] **SSL/TLS Certificates**: Install valid SSL certificates for HTTPS
- [ ] **Firewall Rules**: Configure firewall to only allow necessary ports
- [ ] **Server Hardening**: Disable unnecessary services, update OS packages
- [ ] **User Permissions**: Use non-root users for all services

## Deployment Steps

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install additional tools
sudo apt install -y curl wget git htop
```

### 2. Application Deployment

```bash
# Clone repository
git clone <repository-url>
cd hacka-fi

# Set up environment
cp .env.production.example .env.production
# Edit .env.production with production values

# Deploy services
./deploy.sh production
```

### 3. SSL Configuration (Optional but Recommended)

```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot

# Generate SSL certificates
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with SSL configuration
# Uncomment HTTPS server block and update paths
```

### 4. Database Initialization

```bash
# Run database migrations
docker compose exec api pnpm prisma migrate deploy

# Optional: Seed initial data
docker compose exec api pnpm run seed:production
```

## Post-Deployment Verification

### Health Checks

- [ ] **API Health**: `curl https://your-domain.com/api/health/database`
- [ ] **Web Application**: Verify web application loads correctly
- [ ] **Database Connectivity**: Check database connections
- [ ] **Smart Contract Integration**: Test contract interactions

### Performance Tests

- [ ] **Load Testing**: Use tools like Apache Bench or K6
- [ ] **Memory Usage**: Monitor container memory consumption
- [ ] **Response Times**: Verify API response times are acceptable
- [ ] **Database Performance**: Check query performance

### Security Validation

- [ ] **HTTPS Enforcement**: All traffic redirects to HTTPS
- [ ] **Security Headers**: Verify security headers are present
- [ ] **CORS Configuration**: Ensure CORS is properly configured
- [ ] **Rate Limiting**: Test rate limiting functionality

## Monitoring Setup

### Basic Monitoring

- [ ] **Application Logs**: Configure log aggregation
- [ ] **Error Tracking**: Set up error monitoring (Sentry recommended)
- [ ] **Uptime Monitoring**: Configure uptime checks
- [ ] **Health Dashboards**: Set up basic monitoring dashboards

### Advanced Monitoring (Optional)

```bash
# Deploy monitoring stack
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --profile monitoring

# Access monitoring services:
# - Grafana: http://your-server:3100 (admin/admin123)
# - Prometheus: http://your-server:9090
```

### Key Metrics to Monitor

- [ ] **Response Time**: API endpoint response times
- [ ] **Error Rate**: Application error rates
- [ ] **Database Performance**: Query times and connection pool usage
- [ ] **Resource Usage**: CPU, memory, disk usage
- [ ] **Blockchain Interaction**: Transaction success rates

## Backup Strategy

### Database Backups

```bash
# Set up automated daily backups
crontab -e
# Add: 0 2 * * * docker compose exec -T db pg_dump -U postgres hacka_fi_prod > /backup/db-$(date +\%Y\%m\%d).sql
```

### Application Backups

- [ ] **Code Repository**: Ensure code is backed up to git repository
- [ ] **Environment Files**: Secure backup of environment configuration
- [ ] **Uploaded Files**: Backup strategy for user uploads
- [ ] **Smart Contract ABIs**: Backup contract ABIs and deployment info

## Maintenance Procedures

### Regular Updates

- [ ] **Security Updates**: Monthly OS and package updates
- [ ] **Application Updates**: Regular application updates via CI/CD
- [ ] **Certificate Renewal**: Automated SSL certificate renewal
- [ ] **Database Maintenance**: Regular database optimization

### Incident Response

- [ ] **Contact Information**: Updated contact information for emergencies
- [ ] **Rollback Procedures**: Documented rollback procedures
- [ ] **Backup Restoration**: Tested backup restoration procedures
- [ ] **Communication Plan**: User communication during incidents

## Production Configuration Files

### Required Files

- [ ] `docker-compose.yml` - Main container orchestration
- [ ] `nginx.conf` - Reverse proxy configuration
- [ ] `.env.production` - Production environment variables
- [ ] `deploy.sh` - Deployment automation script

### Optional Files

- [ ] `docker-compose.monitoring.yml` - Monitoring stack
- [ ] SSL certificates in `ssl/` directory
- [ ] Custom monitoring configurations

## Final Verification Commands

```bash
# Check all services are running
docker compose ps

# Verify health endpoints
curl https://your-domain.com/api/health/database
curl https://your-domain.com/api/health/web3

# Check service logs
docker compose logs api web nginx

# Monitor resource usage
docker stats

# Test database connectivity
docker compose exec api pnpm prisma studio
```

## Troubleshooting Common Issues

### Service Won't Start

```bash
# Check container logs
docker compose logs [service-name]

# Check available resources
docker system df
free -h
```

### Database Connection Issues

```bash
# Test database connectivity
docker compose exec db pg_isready -U postgres

# Check database logs
docker compose logs db
```

### SSL/HTTPS Issues

```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443

# Check nginx configuration
docker compose exec nginx nginx -t
```

### Performance Issues

```bash
# Monitor container resources
docker stats

# Check application metrics
curl https://your-domain.com/api/health
```

## Security Incident Response

### If Compromised

1. **Isolate**: Take affected services offline
2. **Assess**: Determine scope of compromise
3. **Contain**: Prevent further damage
4. **Eradicate**: Remove malicious elements
5. **Recover**: Restore services from clean backups
6. **Learn**: Document incident and improve security

### Emergency Contacts

- [ ] **System Administrator**: [Contact Information]
- [ ] **Security Team**: [Contact Information]
- [ ] **Development Team**: [Contact Information]
- [ ] **Infrastructure Provider**: [Contact Information]

## Compliance and Documentation

### Documentation

- [ ] **Deployment Documentation**: Keep deployment procedures updated
- [ ] **Architecture Diagrams**: Document system architecture
- [ ] **API Documentation**: Maintain up-to-date API docs
- [ ] **Security Policies**: Document security procedures

### Compliance (if applicable)

- [ ] **Data Privacy**: Ensure GDPR/privacy compliance
- [ ] **Financial Regulations**: Compliance with relevant financial regulations
- [ ] **Audit Logs**: Maintain comprehensive audit logs
- [ ] **Access Controls**: Document and maintain access controls

---

## Quick Production Commands

```bash
# Deploy production
./deploy.sh production

# Check status
./deploy.sh production status

# View logs
docker compose logs -f api web

# Scale services
docker compose up --scale api=2 --scale web=2 -d

# Backup database
docker compose exec -T db pg_dump -U postgres hacka_fi_prod > backup-$(date +%Y%m%d).sql

# Update application
git pull
docker compose up --build -d

# Emergency stop
docker compose down
```

Remember: Always test changes in a staging environment before applying to production!
