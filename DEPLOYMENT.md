# Milo Website - Complete Deployment Guide

This guide covers deploying both the frontend website and the Cloudflare Workers backend for email signups.

## Project Structure

```
milo/
├── frontend/                    # Static website files
│   ├── index.html              # About page
│   ├── milo_book.html         # Book page
│   ├── milo_writing.html      # Writing page
│   ├── milo_interviews.html   # Interviews page
│   ├── milo_more.html         # More stuff page
│   ├── updates.html           # Email signup page
│   ├── milo_styles.css        # Global styles
│   └── images/                # Book covers and photos
│
└── worker/                     # Cloudflare Worker backend
    ├── src/
    │   └── index.js           # Worker script
    ├── admin/
    │   ├── setup.html         # Admin password setup page
    │   ├── panel.html         # Admin panel interface
    │   └── admin-styles.css   # Admin styles
    ├── schema.sql             # D1 database schema
    ├── wrangler.toml          # Cloudflare config
    ├── package.json           # Dependencies
    └── README.md              # Worker-specific docs
```

## Prerequisites

- **Cloudflare Account** (free tier works)
- **Node.js** v16+ and npm
- **Git** (for version control)
- **Static hosting** for frontend (Cloudflare Pages, Netlify, GitHub Pages, etc.)

---

## Part 1: Deploy Backend (Cloudflare Worker)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens a browser for authentication.

### Step 3: Navigate to Worker Directory

```bash
cd worker
npm install
```

### Step 4: Create D1 Database

```bash
wrangler d1 create milo-signups-db
```

**Output example:**
```
✅ Successfully created DB 'milo-signups-db'!

[[d1_databases]]
binding = "DB"
database_name = "milo-signups-db"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

**IMPORTANT**: Copy the `database_id` from the output.

### Step 5: Update wrangler.toml

Edit `worker/wrangler.toml` and replace line 19:

```toml
database_id = "YOUR_DATABASE_ID_HERE"  # Paste your actual database ID
```

### Step 6: Initialize Database Schema

```bash
# Local database (for testing)
wrangler d1 execute milo-signups-db --file=schema.sql

# Production database (required for deployment)
wrangler d1 execute milo-signups-db --remote --file=schema.sql
```

### Step 7: Deploy Worker

```bash
wrangler deploy
```

**Output example:**
```
✨ Uploaded milo-email-signup (1.23 sec)
✨ Published milo-email-signup (0.45 sec)
  https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev
```

**SAVE THIS URL!** You'll need it for the frontend.

### Step 8: Set Admin Password

1. Visit: `https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/admin-panel-xyz`
2. You'll see a setup page (only shows on first visit)
3. Enter a strong password (min 8 characters)
4. Click "Set Admin Password"
5. **SAVE YOUR PASSWORD** - there's no recovery option!

### Step 9: Test Backend

Test the signup API:

```bash
curl -X POST https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/api/signup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com"}'
```

Expected response:
```json
{"success":true,"message":"Successfully subscribed!"}
```

Test the admin panel:
1. Navigate to: `https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/admin-panel-xyz`
2. Login with your admin password
3. You should see your test signup

---

## Part 2: Deploy Frontend (Static Site)

### Option A: Cloudflare Pages (Recommended)

#### 1. Connect Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository: `RetroLancers/milo_site`
4. Configure build settings:
   - **Build command**: Leave empty (static site, no build needed)
   - **Build output directory**: `frontend`
   - **Root directory**: `/`

5. Click "Save and Deploy"

#### 2. Update Worker URL in Frontend

After backend deployment, edit `frontend/updates.html` line 82:

```javascript
const WORKER_URL = 'https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/api/signup';
```

Replace `YOUR-SUBDOMAIN` with your actual Worker URL from Part 1, Step 7.

#### 3. Commit and Push

```bash
git add frontend/updates.html
git commit -m "Updated Worker URL for email signup"
git push origin main
```

Cloudflare Pages will automatically redeploy.

#### 4. Get Your Live URL

Cloudflare Pages will provide a URL like:
```
https://milo-site.pages.dev
```

You can also add a custom domain in the Pages dashboard.

---

### Option B: Netlify

#### 1. Install Netlify CLI (optional)

```bash
npm install -g netlify-cli
netlify login
```

#### 2. Deploy via Web Interface

1. Go to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git repository
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: Leave empty
   - **Publish directory**: `.` (current directory)

5. Click "Deploy site"

#### 3. Update Worker URL

Same as Option A, Step 2 above.

---

### Option C: GitHub Pages

#### 1. Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/frontend` (if supported) or `/` (root)

**Note**: If GitHub Pages doesn't support subfolder deployment from your plan, you may need to:
- Move `frontend/*` files back to root, OR
- Create a separate `gh-pages` branch with frontend files at root

#### 2. Update Worker URL

Same as Option A, Step 2 above.

#### 3. Access Your Site

Your site will be available at:
```
https://YOUR-USERNAME.github.io/milo_site/
```

---

## Part 3: Final Configuration

### 1. Secure Admin Panel Path (Recommended)

For additional security, change the admin panel path from `/admin-panel-xyz` to something secret:

Edit `worker/src/index.js` and replace all instances of `admin-panel-xyz`:

```javascript
// Line 44
if (url.pathname === '/your-secret-admin-path/admin-styles.css') {

// Line 51
if (url.pathname === '/your-secret-admin-path/api/signups') {

// Line 56
if (url.pathname === '/your-secret-admin-path') {

// Line 61
if (url.pathname === '/your-secret-admin-path/export') {
```

Then redeploy:
```bash
cd worker
wrangler deploy
```

### 2. Restrict CORS to Your Domain (Production)

Edit `worker/src/index.js` line 27:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com', // Your actual domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

Redeploy:
```bash
cd worker
wrangler deploy
```

### 3. Add Custom Domain (Optional)

#### For Worker:

1. In Cloudflare Dashboard → Workers & Pages
2. Click your Worker → Settings → Triggers
3. Click "Add Custom Domain"
4. Enter: `api.yourdomain.com`
5. Update `frontend/updates.html` with new API URL

#### For Frontend (Cloudflare Pages):

1. In Pages dashboard → Custom domains
2. Click "Set up a custom domain"
3. Enter: `yourdomain.com` or `www.yourdomain.com`
4. Follow DNS configuration instructions

---

## Testing Checklist

### Backend Tests

- [ ] Signup API accepts valid submissions
- [ ] Duplicate email rejected with 409 error
- [ ] Invalid email format rejected
- [ ] Rate limiting works (5 requests/minute)
- [ ] Admin panel requires authentication
- [ ] Admin panel displays signups correctly
- [ ] CSV export downloads successfully
- [ ] Database persists after Worker redeployment

### Frontend Tests

- [ ] All navigation links work
- [ ] Responsive design on mobile, tablet, desktop
- [ ] Hamburger menu works on mobile
- [ ] Signup form submits successfully
- [ ] Success lightbox appears after signup
- [ ] Form shows error for duplicate email
- [ ] Form resets after successful submission
- [ ] No console errors in browser

---

## Common Issues & Troubleshooting

### "Database not found" Error

- Verify `database_id` in `worker/wrangler.toml` matches your D1 database
- Run: `wrangler d1 list` to see your databases
- Re-run schema initialization with `--remote` flag

### Admin Panel Shows 401 Unauthorized

- Password is case-sensitive
- Try clearing browser cache/cookies
- Verify password was set correctly (visit setup page again)

### Signup Form Not Working

- Check Worker URL in `frontend/updates.html` line 82
- Verify CORS settings allow your frontend domain
- Check browser console for errors
- Test API directly with curl

### Worker Deployment Fails

- Ensure you're in the `worker/` directory
- Run `npm install` to install dependencies
- Check `wrangler.toml` syntax is correct
- Verify you're logged in: `wrangler whoami`

### Rate Limiting Too Strict/Loose

Edit `worker/src/index.js` lines 18-19:

```javascript
const RATE_LIMIT_WINDOW = 60000; // milliseconds (60000 = 1 minute)
const MAX_REQUESTS_PER_WINDOW = 5; // number of requests
```

Redeploy after changes.

---

## Database Management

### View All Signups

```bash
cd worker
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"
```

### Count Total Signups

```bash
wrangler d1 execute milo-signups-db --remote --command="SELECT COUNT(*) FROM signups"
```

### Backup Database

```bash
wrangler d1 export milo-signups-db --remote --output=backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
wrangler d1 execute milo-signups-db --remote --file=backup-20241015.sql
```

### Delete All Signups (CAREFUL!)

```bash
wrangler d1 execute milo-signups-db --remote --command="DELETE FROM signups"
```

---

## Updating the Site

### Frontend Changes

1. Edit files in `frontend/` directory
2. Test locally by opening HTML files in browser
3. Commit and push to Git
4. Hosting platform auto-deploys (Cloudflare Pages, Netlify)

### Backend Changes

1. Edit files in `worker/` directory
2. Test locally: `cd worker && wrangler dev --remote`
3. Deploy: `wrangler deploy`
4. Database data persists automatically

### Database Schema Changes

**WARNING**: Schema changes can affect existing data!

1. Backup first: `wrangler d1 export milo-signups-db --remote --output=backup.sql`
2. Edit `worker/schema.sql`
3. Apply changes: `wrangler d1 execute milo-signups-db --remote --file=schema.sql`
4. Redeploy Worker: `wrangler deploy`

---

## Cost Estimate (Free Tier)

### Cloudflare Workers & D1
- **Workers**: 100,000 requests/day (free)
- **D1 Database**: 5 GB storage, 5M reads/day (free)
- **No credit card required**

### Cloudflare Pages
- **Bandwidth**: Unlimited
- **Builds**: 500/month (free)
- **No credit card required**

### Typical Email Signup Site
- Expected cost: **$0/month** (stays within free tiers)

---

## Support Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **D1 Database Docs**: https://developers.cloudflare.com/d1/
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/
- **GitHub Issues**: Report bugs to your repository issues page

---

## Quick Reference Commands

```bash
# Backend (from worker/ directory)
wrangler login                  # Login to Cloudflare
wrangler dev --remote          # Test locally with prod database
wrangler deploy                # Deploy Worker
wrangler tail                  # View live logs
wrangler d1 list               # List all D1 databases

# Database
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"
wrangler d1 export milo-signups-db --remote --output=backup.sql

# Frontend (from root directory)
git add frontend/
git commit -m "Update frontend"
git push origin main           # Auto-deploys on Cloudflare Pages/Netlify
```

---

## Security Best Practices

1. **Change Default Admin Path**: Don't use `/admin-panel-xyz` in production
2. **Use Strong Admin Password**: Minimum 12 characters, mixed case, numbers, symbols
3. **Restrict CORS**: Set to your domain only (not `*`)
4. **Enable 2FA**: On your Cloudflare account
5. **Monitor Logs**: Regularly check `wrangler tail` for suspicious activity
6. **Backup Regularly**: Schedule weekly database backups
7. **Custom Domain**: Use custom domain with HTTPS (Cloudflare provides free SSL)

---

## Next Steps After Deployment

- [ ] Test all functionality end-to-end
- [ ] Set up monitoring/alerts for Worker errors
- [ ] Configure custom domain
- [ ] Add Google Analytics or similar (if desired)
- [ ] Document admin password in secure password manager
- [ ] Schedule regular database backups
- [ ] Share admin panel URL only with authorized users

---

**Your site is now live!** 🎉

Frontend: `https://yourdomain.com`
Admin Panel: `https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/admin-panel-xyz`

Remember to update `YOUR-SUBDOMAIN` and admin path with your actual values.
