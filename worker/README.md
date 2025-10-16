# Milo Email Signup - Cloudflare Worker Backend

This is a production-ready Cloudflare Worker backend for handling email signups with a D1 database and secure admin panel.

## Features

- **Email Signup API**: REST endpoint for form submissions
- **D1 Database**: Persistent storage with duplicate email prevention
- **Admin Panel**: Password-protected interface at `/admin-panel-xyz`
- **CSV Export**: Download all signups in Excel/Sheets-compatible format
- **Rate Limiting**: Prevents spam (5 requests/minute per IP)
- **Security**: Input sanitization, email validation, hashed passwords
- **CORS Support**: Ready for cross-origin requests

## Project Structure

```
worker/
├── src/
│   └── index.js          # Main Worker script with all routes
├── schema.sql            # D1 database schema
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies
└── README.md            # This file
```

## Prerequisites

1. **Cloudflare Account** (free tier works)
2. **Node.js** (v16 or higher)
3. **npm** or **yarn**

## Initial Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

### 3. Install Dependencies

```bash
cd worker
npm install
```

### 4. Create D1 Database

```bash
wrangler d1 create milo-signups-db
```

This will output something like:

```
✅ Successfully created DB 'milo-signups-db'!

[[d1_databases]]
binding = "DB"
database_name = "milo-signups-db"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

**IMPORTANT**: Copy the `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "milo-signups-db"
database_id = "YOUR_ACTUAL_DATABASE_ID_HERE"  # Replace this!
```

### 5. Initialize Database Schema

Run this command to create the tables:

```bash
wrangler d1 execute milo-signups-db --file=schema.sql
```

You should see:

```
🌀 Mapping SQL input into an array of statements
🌀 Executing on milo-signups-db (xxxx-xxxx-xxxx-xxxx):
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
```

**Also run for production database:**

```bash
wrangler d1 execute milo-signups-db --remote --file=schema.sql
```

### 6. Deploy Worker

```bash
wrangler deploy
```

After deployment, you'll see:

```
✨ Uploaded milo-email-signup (x.xx sec)
✨ Published milo-email-signup (x.xx sec)
  https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev
```

**Save this URL!** You'll need it for the frontend.

## Setting Admin Password (First Time Only)

1. Visit your Worker URL: `https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/admin-panel-xyz`
2. You'll see a setup page (only shows on first visit)
3. Enter a strong password (minimum 8 characters)
4. Click "Set Admin Password"
5. Password is hashed and stored - **this can only be done once**

**IMPORTANT**: Save this password securely! There's no password recovery.

## Updating the Frontend

Edit `updates.html` and replace `YOUR_WORKER_URL_HERE` with your actual Worker URL:

```javascript
const WORKER_URL = 'https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/api/signup';
```

Located at line 82 in `updates.html`.

## Testing

### Test Signup Endpoint

```bash
curl -X POST https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/api/signup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com"}'
```

Expected response:

```json
{"success":true,"message":"Successfully subscribed!"}
```

### Test Admin Panel

1. Navigate to: `https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/admin-panel-xyz`
2. Login with your admin password
3. You should see a table of signups

### Export CSV

While logged into admin panel, click "Export to CSV" button.

## Development Workflow

### Local Development

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787`

**Note**: Local mode uses a temporary D1 database. Use `--remote` to test against production:

```bash
wrangler dev --remote
```

### View Logs

```bash
wrangler tail
```

This shows real-time logs from your deployed Worker.

## Redeployment (Without Losing Data)

Your D1 database is **separate from your Worker code**. Redeploying the Worker **does not affect your database**.

To redeploy after code changes:

```bash
wrangler deploy
```

Data is preserved automatically.

## Database Management

### Backup Data (Export All Signups)

```bash
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"
```

Or use the admin panel CSV export feature.

### View All Records

```bash
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"
```

### Check Record Count

```bash
wrangler d1 execute milo-signups-db --remote --command="SELECT COUNT(*) FROM signups"
```

### Manual Backup (Full Database)

```bash
wrangler d1 export milo-signups-db --remote --output=backup.sql
```

### Restore from Backup

```bash
wrangler d1 execute milo-signups-db --remote --file=backup.sql
```

## Security Notes

### Rate Limiting

- 5 signups per minute per IP address
- In-memory tracking (resets on Worker restart)
- Upgrade to Workers KV for persistent rate limiting

### Admin Panel Security

- **Custom Path**: Change `/admin-panel-xyz` to something unique in `src/index.js`
- **Password Hashing**: SHA-256 hashed passwords (not plaintext)
- **Basic Auth**: Uses HTTP Basic Authentication
- **One-Time Setup**: Admin password can only be set once

### Input Validation

- Email format validation
- Input sanitization (trim, length limits)
- SQL injection prevention (parameterized queries)
- Duplicate email prevention (UNIQUE constraint)

## Customization

### Change Admin Path

Edit `src/index.js` and replace all instances of `/admin-panel-xyz`:

```javascript
if (url.pathname === '/your-secret-path') {
  return await handleAdmin(request, env);
}

if (url.pathname === '/your-secret-path/export') {
  return await handleExport(request, env);
}
```

Also update references in the HTML templates at the bottom of the file.

### Restrict CORS to Your Domain

Edit `src/index.js` line 20:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com', // Your domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### Add Custom Domain

1. In Cloudflare Dashboard, go to Workers & Pages
2. Click your Worker → Settings → Triggers → Add Custom Domain
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Update `updates.html` with new URL

## Troubleshooting

### "Database not found" error

- Make sure you've updated `database_id` in `wrangler.toml`
- Run `wrangler d1 list` to verify database exists
- Try `wrangler deploy` again

### "UNIQUE constraint failed" on signup

- This email is already in the database
- This is expected behavior (duplicate prevention)

### Admin panel shows 401 Unauthorized

- Clear browser cache/cookies
- Make sure password was set (visit setup page first)
- Password is case-sensitive

### Local development not working

- Use `wrangler dev --remote` to connect to production database
- Local D1 database is temporary and separate

### Rate limiting too strict

Edit `src/index.js` lines 14-15:

```javascript
const RATE_LIMIT_WINDOW = 60000; // milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // increase this
```

## Cost Estimate (Cloudflare Free Tier)

- **Workers**: 100,000 requests/day (free)
- **D1 Database**: 5 GB storage, 5 million reads/day (free)
- **No credit card required** for free tier

For typical email signups, you'll stay well within free limits.

## Support

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **D1 Database Docs**: https://developers.cloudflare.com/d1/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/

## License

MIT
