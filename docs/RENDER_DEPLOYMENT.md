# Render Deployment Guide for CObot+

## Prerequisites
- GitHub repository with your code pushed
- Render account (sign up at https://render.com)
- Your Supabase credentials ready

---

## Step 1: Push Your Code to GitHub

Make sure all your changes are committed and pushed:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

---

## Step 2: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `AdlanHalim/cobot-plus-fyp`
5. Choose the branch: `main` (or your default branch)

---

## Step 3: Configure the Web Service

Use these settings:

| Setting | Value |
|---------|-------|
| **Name** | `cobot-plus` |
| **Region** | `Singapore (Southeast Asia)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | `Free` (or Starter for better performance) |

---

## Step 4: Add Environment Variables

In the Render dashboard, go to **Environment** tab and add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | From Supabase dashboard (Settings → API) |
| `NEXT_PUBLIC_PI_URL` | `http://your-pi-ip:5000` | Your Raspberry Pi URL |
| `NEXT_PUBLIC_PI_API_KEY` | `your-secret-key` | Optional, for security |

### How to Get Supabase Keys:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically start building your app
3. Wait for the build to complete (usually 3-5 minutes)
4. Once deployed, you'll get a URL like: `https://cobot-plus.onrender.com`

---

## Step 6: Verify Deployment

1. Visit your Render URL
2. Check the health endpoint: `https://cobot-plus.onrender.com/api/health`
3. You should see: `{"status":"ok","timestamp":"...","service":"cobot-plus"}`

---

## Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Try running `npm run build` locally first

### Environment Variables Not Working
- Make sure variable names match exactly (case-sensitive)
- Redeploy after adding/changing environment variables
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser

### Slow Cold Starts (Free Plan)
- Free tier instances spin down after 15 minutes of inactivity
- First request after inactivity may take 30-60 seconds
- Upgrade to Starter plan ($7/month) for always-on service

### Raspberry Pi Connection Issues
- The Pi must be accessible from the internet (port forwarding or ngrok)
- Update `NEXT_PUBLIC_PI_URL` with the public URL
- Consider using a service like ngrok for the Pi

---

## Important Notes

### Raspberry Pi Connectivity
Your Render-hosted app needs to communicate with your Raspberry Pi. Options:

1. **Port Forwarding**: Configure your router to forward port 5000 to the Pi
2. **Ngrok Tunnel**: Use `ngrok http 5000` on the Pi and use the ngrok URL
3. **Cloudflare Tunnel**: Free alternative to ngrok

Update `NEXT_PUBLIC_PI_URL` with the publicly accessible URL.

### Auto-Deploy
With the `render.yaml` file, every push to your main branch will trigger an automatic deployment.

### Custom Domain (Optional)
1. Go to your service in Render
2. Click **Settings** → **Custom Domains**
3. Add your domain and follow DNS configuration instructions

---

## Quick Reference

| Item | URL |
|------|-----|
| Render Dashboard | https://dashboard.render.com |
| Your App | https://cobot-plus.onrender.com |
| Health Check | https://cobot-plus.onrender.com/api/health |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## Files Added for Render

1. **`render.yaml`** - Render blueprint configuration
2. **`pages/api/health.js`** - Health check endpoint

These files enable Render to properly build and monitor your application.
