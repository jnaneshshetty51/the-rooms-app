# Production Deployment Checklist

## Pre-Deployment
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run type-check` - no errors  
- [ ] Run tests (if any)
- [ ] Review migration files
- [ ] Backup production database

## Environment Variables
- [ ] `DATABASE_URL` - production PostgreSQL
- [ ] `NEXTAUTH_SECRET` - randomly generated 32+ char secret
- [ ] `NEXTAUTH_URL` - production URL
- [ ] `REDIS_URL` - production Redis (if using)
- [ ] Payment gateway credentials
- [ ] Email credentials
- [ ] File storage credentials (MinIO/S3)

## Security
- [ ] HTTPS enabled
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Admin accounts with strong passwords
- [ ] Audit logging enabled

## Database
- [ ] Run migrations: `prisma migrate deploy`
- [ ] Run seed if needed: `prisma db seed`
- [ ] Indexes created
- [ ] Slow Query performance acceptable

## Monitoring
- [ ] Health check endpoint working
- [ ] Error tracking configured
- [ ] Logs aggregated
- [ ] Alerts configured

## Rollback Plan
- [ ] Database backup available
- [ ] Previous deployment package saved
- [ ] Rollback procedure documented
