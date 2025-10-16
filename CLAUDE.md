# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Milo Beckman's personal portfolio website - a static HTML/CSS site showcasing his book "Math Without Numbers", writing portfolio, interviews, and other projects. The site includes email signup functionality with a Cloudflare Workers backend and admin panel.

**Repository**: git@github.com:RetroLancers/milo_site.git

## Architecture

### Frontend (Static Site)
- **Location**: `frontend/` directory
- **Technology**: Plain HTML5, CSS3, vanilla JavaScript (no frameworks)
- **Structure**: 6 main HTML pages with shared navigation and styling
- **Styling**: Single `milo_styles.css` file using CSS Grid layout
- **Responsive**: Mobile-first design with hamburger menu for mobile viewports
- **Deployment**: Can be deployed to Cloudflare Pages, Netlify, GitHub Pages, or any static host

### Backend (Cloudflare Workers)
- **Location**: `worker/` directory (independent from frontend)
- **Technology**: Cloudflare Workers + D1 SQLite database
- **Purpose**: Email signup API and password-protected admin panel
- **Deployment**: Deployed via Wrangler CLI to Cloudflare Workers
- **Admin Interface**: Served from `worker/admin/` directory (HTML/CSS files bundled with Worker)

## File Structure

```
milo/
├── frontend/                    # Static website (deploy this to hosting)
│   ├── index.html              # About page
│   ├── milo_book.html         # Book showcase
│   ├── milo_writing.html      # Writing portfolio
│   ├── milo_interviews.html   # Press & interviews
│   ├── milo_more.html         # Miscellaneous projects
│   ├── updates.html           # Email signup form (connects to Worker)
│   ├── milo_styles.css        # Global styles for all pages
│   └── images/                # Book covers and photos
│
├── worker/                     # Cloudflare Worker backend (deploy separately)
│   ├── src/
│   │   └── index.js          # Worker script (all routes and logic)
│   ├── admin/
│   │   ├── setup.html        # Admin password setup page
│   │   ├── panel.html        # Admin panel interface
│   │   └── admin-styles.css  # Admin panel styles
│   ├── schema.sql            # D1 database schema
│   ├── wrangler.toml         # Cloudflare configuration
│   ├── package.json          # Dependencies
│   └── README.md             # Worker-specific documentation
│
├── DEPLOYMENT.md              # Complete deployment guide
├── CLAUDE.md                  # This file
└── .gitignore                # Excludes tasks.md, worker/.wrangler, etc.
```

## Key Design Patterns

### 1. Shared Navigation (Frontend)
All pages use identical navigation structure with active state highlighting:
```html
<nav>
    <h1><a href="index.html">Milo Beckman</a></h1>
    <div class="hamburger">...</div>
    <ul>
        <li><a href="index.html">About</a></li>
        <li><a href="milo_book.html">Math Without Numbers</a></li>
        <li><a href="milo_writing.html">Writing</a></li>
        <li><a href="milo_interviews.html">Interviews & Press</a></li>
        <li><a href="milo_more.html">More Stuff</a></li>
        <li><a href="updates.html" class="active">Updates</a></li>
    </ul>
</nav>
```

Each page marks its corresponding nav link with `class="active"`.

### 2. Responsive Layout Strategy
- **Desktop**: Two-column grid (250px fixed sidebar + flexible main content)
- **Tablet** (≤868px): Single column content
- **Mobile** (≤768px): Hamburger menu, full-width layout
- **Small Mobile** (≤480px): Further font/spacing adjustments

### 3. Email Signup Flow
1. User fills form in `frontend/updates.html`
2. JavaScript POSTs to Cloudflare Worker endpoint (`/api/signup`)
3. Worker validates, sanitizes, and stores in D1 database
4. Success triggers lightbox modal, form resets
5. Admin can view signups at `/admin-panel-xyz`

### 4. Worker Architecture

#### Routes:
- `POST /api/signup` - Public email signup API (JSON)
- `GET /admin-panel-xyz` - Admin panel main page (serves `admin/panel.html` or `admin/setup.html`)
- `POST /admin-panel-xyz` - Handle admin password setup (one-time)
- `GET /admin-panel-xyz/api/signups` - JSON API for fetching signups (authenticated)
- `GET /admin-panel-xyz/export` - CSV export (authenticated)
- `GET /admin-panel-xyz/admin-styles.css` - Serve admin CSS file

#### Static Asset Serving:
- Admin HTML/CSS files imported as text strings in Worker (using Wrangler's text import)
- Configured in `wrangler.toml` with `[[rules]]` for `.html` and `.css` files
- No external asset hosting needed - everything bundled in Worker

#### Security Features:
- **Rate limiting**: In-memory (5 requests/min per IP for signups)
- **Password hashing**: SHA-256 for admin credentials
- **One-time setup**: Admin password can only be set once
- **HTTP Basic Auth**: For admin panel access
- **Input sanitization**: On all user inputs
- **CORS headers**: Configurable origin restrictions

## Common Tasks

### Frontend Development

**Local testing**: Open HTML files directly in browser (no build step required)

```bash
# Open any page in browser
open frontend/index.html  # macOS
start frontend/index.html # Windows
```

**Edit styles**: Modify `frontend/milo_styles.css` (applies to all pages automatically)

**Add new page**:
1. Create `frontend/new_page.html` following existing page structure
2. Add navigation link to all 7 HTML files
3. Add responsive styles to `frontend/milo_styles.css` if needed

**Update signup form**:
- Modify `frontend/updates.html` form fields
- Update Worker endpoint URL at line 82

### Backend Development (Worker)

**Install dependencies**:
```bash
cd worker
npm install
```

**Local development with remote database**:
```bash
cd worker
wrangler dev --remote
```

This runs Worker locally but uses production D1 database.

**Deploy Worker**:
```bash
cd worker
wrangler deploy
```

**View real-time logs**:
```bash
cd worker
wrangler tail
```

**Update admin HTML/CSS**:
1. Edit files in `worker/admin/` directory
2. Changes automatically bundled on next `wrangler deploy`
3. No manual asset upload needed

**Database operations**:
```bash
# View all signups
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"

# Count signups
wrangler d1 execute milo-signups-db --remote --command="SELECT COUNT(*) FROM signups"

# Backup database
wrangler d1 export milo-signups-db --remote --output=backup.sql

# Restore database
wrangler d1 execute milo-signups-db --remote --file=backup.sql
```

**Update database schema**:
1. Backup first: `wrangler d1 export milo-signups-db --remote --output=backup.sql`
2. Edit `worker/schema.sql`
3. Run: `wrangler d1 execute milo-signups-db --remote --file=schema.sql`
4. Redeploy Worker if logic changed: `wrangler deploy`

## Important Configuration

### Worker Endpoint URL
After deploying the Worker, update `frontend/updates.html` line 82:
```javascript
const WORKER_URL = 'https://milo-email-signup.YOUR-SUBDOMAIN.workers.dev/api/signup';
```

### Admin Panel Path
Default: `/admin-panel-xyz`

**For security**, change this in `worker/src/index.js` to a secret path:
- Line 44: CSS route
- Line 51: API signups route
- Line 56: Admin panel route
- Line 61: Export route

### Database Configuration
Located in `worker/wrangler.toml` line 19 - must match your Cloudflare D1 database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "milo-signups-db"
database_id = "xxxx-xxxx-xxxx-xxxx"  # Replace with actual ID from wrangler d1 create
```

### Text Import Rules
`worker/wrangler.toml` lines 8-12 configure HTML/CSS imports:
```toml
[[rules]]
type = "Text"
globs = ["**/*.html", "**/*.css"]
fallthrough = true
```

This allows Worker to import admin files as strings.

## Deployment Workflow

### Full Deployment (First Time)

See `DEPLOYMENT.md` for complete step-by-step guide. Quick summary:

1. **Deploy Backend**:
   ```bash
   cd worker
   wrangler d1 create milo-signups-db  # Get database ID
   # Update wrangler.toml with database ID
   wrangler d1 execute milo-signups-db --remote --file=schema.sql
   wrangler deploy
   # Visit /admin-panel-xyz to set password
   ```

2. **Update Frontend**:
   ```bash
   # Edit frontend/updates.html with Worker URL
   git add frontend/updates.html
   git commit -m "Update Worker URL"
   git push origin main
   ```

3. **Deploy Frontend**:
   - **Cloudflare Pages**: Auto-deploys from Git, set build output to `frontend/`
   - **Netlify**: Connect repo, set base directory to `frontend/`
   - **GitHub Pages**: Enable Pages, point to `frontend/` directory
   - **Manual**: Upload `frontend/*` files to any static host

### Updating After Deployment

**Frontend changes**:
```bash
# Edit files in frontend/
git add frontend/
git commit -m "Update frontend"
git push origin main
# Auto-deploys if using Cloudflare Pages or Netlify
```

**Backend changes**:
```bash
cd worker
# Edit files in worker/src/ or worker/admin/
wrangler deploy
# Database data persists automatically
```

### Database Safety
- D1 database persists independently of Worker deployments
- Redeploying Worker code does NOT affect database data
- Always backup before schema changes: `wrangler d1 export milo-signups-db --remote --output=backup.sql`

## Security Considerations

### Admin Panel
- Password set once on first visit (one-time setup)
- SHA-256 hashed password storage (not plaintext)
- HTTP Basic Authentication for access control
- **IMPORTANT**: Change default path `/admin-panel-xyz` to custom secret path in production

### Form Validation
- **Client-side**: HTML5 required attributes, email type validation
- **Server-side**: Email regex validation, input sanitization, duplicate prevention
- **Rate limiting**: 5 submissions/min per IP (configurable in `worker/src/index.js` lines 18-19)

### CORS Policy
Default: `Access-Control-Allow-Origin: *` (allows all domains)

**For production**, restrict to your domain in `worker/src/index.js` line 27:
```javascript
'Access-Control-Allow-Origin': 'https://yourdomain.com',
```

## Style Guidelines

### Color Scheme (Frontend)
- Primary text: `#333` (dark gray)
- Secondary text: `#666` (medium gray)
- Backgrounds: White and light gray (`#f5f5f5`, `#f8f9fa`)
- Accents: Dark borders (`#ddd`, `#eee`)
- Links: Inherit text color (no blue)

### Typography
- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- No custom web fonts (system fonts only)

### Layout Conventions
- Content max-width: 1000-1200px
- Sidebar width: 250px (desktop)
- Padding: 20-40px depending on viewport
- Border radius: 4-8px for cards/inputs

## Testing Checklist

### Before Deploying Frontend
- [ ] Test all navigation links work correctly
- [ ] Verify responsive layout on desktop, tablet, mobile viewports
- [ ] Check form submission with deployed Worker URL
- [ ] Test success lightbox modal appears and closes
- [ ] Validate HTML has no console errors
- [ ] Confirm images load correctly

### Before Deploying Worker
- [ ] Test locally: `wrangler dev --remote`
- [ ] Verify D1 connection: Check `database_id` in `wrangler.toml` matches `wrangler d1 list`
- [ ] Test signup endpoint with curl or Postman
- [ ] Test admin panel authentication (login/logout)
- [ ] Test CSV export downloads correctly
- [ ] Check rate limiting behavior (try 6+ signups quickly)
- [ ] Review CORS settings match your frontend domain

### Integration Tests
- [ ] Submit signup from frontend → appears in admin panel
- [ ] Duplicate email rejected with proper error message
- [ ] Invalid email format rejected
- [ ] Rate limiting prevents spam
- [ ] CSV export contains all signups with correct data

## Known Issues

See `tasks.md` (if exists) for current bugs. Common issues:
1. Navigation highlighting issues on some pages
2. Link styling preferences (no blue, no underline)
3. Section header alignment inconsistencies
4. Visual spacing adjustments needed

## Resources

- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **D1 Database**: https://developers.cloudflare.com/d1/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Cloudflare Pages**: https://developers.cloudflare.com/pages/

## Git Workflow

**Current branch**: `main`

**Commit style**: Descriptive messages focusing on user-facing changes
- Example: "Update admin panel with search and export features"
- Example: "Add email signup form to updates page"

**Files to ignore** (`.gitignore`):
- `tasks.md`
- `pg*` files
- `*zip` files
- `.idea/` IDE configs
- `worker/.wrangler/` (Wrangler build artifacts)
- `worker/node_modules/`

## Quick Reference Commands

```bash
# Frontend (from root directory)
open frontend/index.html              # Open locally
git add frontend/
git commit -m "Update frontend"
git push origin main                  # Deploy (if using auto-deploy)

# Backend (from worker/ directory)
npm install                           # Install dependencies
wrangler login                        # Login to Cloudflare
wrangler dev --remote                 # Test locally
wrangler deploy                       # Deploy to production
wrangler tail                         # View logs
wrangler d1 list                      # List databases
wrangler d1 execute milo-signups-db --remote --command="SELECT * FROM signups"

# Database backup
wrangler d1 export milo-signups-db --remote --output=backup-$(date +%Y%m%d).sql
```

## Support

For detailed deployment instructions, see `DEPLOYMENT.md`.

For Worker-specific documentation, see `worker/README.md`.

For issues, check repository: https://github.com/RetroLancers/milo_site
