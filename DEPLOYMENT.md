# Deployment Guide

## Quick Deploy to Free Hosting Services

### 1. Render.com (Recommended for beginners)

**Step 1:** Create a Render account at [render.com](https://render.com)

**Step 2:** Create a new Web Service
- Connect your GitHub repository
- Choose "Build and deploy from a Git repository"

**Step 3:** Configure your service:
```
Name: whatsapp-clone-backend
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Step 4:** Add Environment Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone
JWT_SECRET=your-super-secure-secret-key-here
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
CLIENT_URL=https://your-frontend-domain.com
```

**Step 5:** Deploy! Your backend will be available at `https://your-service-name.onrender.com`

### 2. Railway.app

**Step 1:** Install Railway CLI
```bash
npm install -g @railway/cli
```

**Step 2:** Login and deploy
```bash
railway login
railway init
railway add --env
railway up
```

**Step 3:** Add environment variables in Railway dashboard

### 3. Fly.io

**Step 1:** Install Fly CLI from [fly.io](https://fly.io)

**Step 2:** Launch your app
```bash
fly launch
```

**Step 3:** Set environment variables
```bash
fly secrets set NODE_ENV=production
fly secrets set MONGODB_URI=your-mongodb-uri
fly secrets set JWT_SECRET=your-jwt-secret
# ... add other variables
```

**Step 4:** Deploy
```bash
fly deploy
```

## Database Setup (MongoDB Atlas)

**Step 1:** Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)

**Step 2:** Create a new cluster (choose M0 for free tier)

**Step 3:** Create database user:
- Username: your-username
- Password: secure-password

**Step 4:** Whitelist IP addresses:
- Add `0.0.0.0/0` to allow access from anywhere
- Or add your hosting service's IP ranges

**Step 5:** Get connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/whatsapp-clone
```

## Gmail Setup for Email Service

**Step 1:** Enable 2-Factor Authentication on your Gmail account

**Step 2:** Generate App Password:
- Go to Google Account Settings
- Security → App passwords
- Generate password for "Mail"

**Step 3:** Use the generated password in `EMAIL_PASS` environment variable

## Environment Variables Checklist

Make sure all these variables are set in your hosting platform:

- ✅ `NODE_ENV=production`
- ✅ `PORT=5000` (or leave empty for auto-assignment)
- ✅ `MONGODB_URI=mongodb+srv://...`
- ✅ `JWT_SECRET=your-secret-key`
- ✅ `JWT_EXPIRES_IN=7d`
- ✅ `EMAIL_HOST=smtp.gmail.com`
- ✅ `EMAIL_PORT=587`
- ✅ `EMAIL_USER=your-email@gmail.com`
- ✅ `EMAIL_PASS=your-app-password`
- ✅ `CLIENT_URL=https://your-frontend-url.com`
- ✅ `RATE_LIMIT_WINDOW_MS=900000`
- ✅ `RATE_LIMIT_MAX_REQUESTS=100`

## Testing Your Deployment

**Step 1:** Health Check
Visit: `https://your-backend-url.com/health`
Should return: `{"status":"success","message":"WhatsApp Clone Backend is running!"}`

**Step 2:** Test Registration
```bash
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**Step 3:** Test with Frontend
Update your frontend to use the new backend URL.

## Common Issues & Solutions

### Issue: CORS errors
**Solution:** Make sure `CLIENT_URL` is set correctly in environment variables

### Issue: Database connection fails
**Solution:** 
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Ensure database user has proper permissions

### Issue: Email not sending
**Solution:**
- Verify Gmail app password is correct
- Check if 2FA is enabled on Gmail account
- Try using a different email service

### Issue: JWT errors
**Solution:**
- Ensure `JWT_SECRET` is set and the same across deployments
- Check if secret is long enough (recommended 32+ characters)

### Issue: Socket.io connection fails
**Solution:**
- Ensure your hosting service supports WebSocket connections
- Check CORS configuration in socket.io setup

## Performance Tips

1. **Enable compression** (already included in the code)
2. **Use CDN** for static assets if you add them later
3. **Database indexing** (already optimized in models)
4. **Rate limiting** (already implemented)
5. **Monitor memory usage** on free tiers

## Monitoring Your App

Most hosting services provide basic monitoring. For production apps, consider:

- **Logging**: Use services like LogRocket or Papertrail
- **Monitoring**: Use Datadog, New Relic, or built-in service monitoring
- **Error Tracking**: Use Sentry for error tracking

## Scaling Considerations

When you outgrow free tiers:

1. **Upgrade hosting plan** for more resources
2. **Database optimization** with proper indexing
3. **Implement caching** (Redis)
4. **Load balancing** for multiple instances
5. **CDN** for static content

Your WhatsApp Clone backend is now ready for production! 🚀
