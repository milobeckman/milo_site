# Milo Beckman - Personal Website

Personal portfolio website for author and educator Milo Beckman, featuring his book "Math Without Numbers", writing portfolio, interviews, and email signup functionality.

**Live Site**: [Add your URL here]

## Project Structure

```
milo/
├── frontend/          # Static website (HTML/CSS/JS)
├── worker/            # Cloudflare Worker backend (email signups + admin)
├── DEPLOYMENT.md      # Complete deployment guide
└── CLAUDE.md         # Development guide for Claude Code
```

## Features

- **Portfolio Pages**: About, book showcase, writing samples, interviews, and miscellaneous projects
- **Email Signup**: Cloudflare Workers backend with D1 database
- **Admin Panel**: Password-protected interface to view and export signups
- **Responsive Design**: Mobile-first with hamburger menu
- **Modern Stack**: Vanilla JavaScript, no frameworks, Cloudflare edge computing

## Quick Start

### View Frontend Locally

```bash
# Open any page directly in browser
open frontend/index.html
```

No build process required!

### Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions covering:
- Cloudflare Workers backend setup
- D1 database configuration
- Frontend deployment (Pages/Netlify/GitHub Pages)
- Admin panel setup

### Development

See [CLAUDE.md](CLAUDE.md) for:
- Project architecture
- Common tasks
- Configuration details
- Testing checklist

## Technology Stack

**Frontend:**
- HTML5, CSS3 (Grid layout)
- Vanilla JavaScript
- System fonts (no external dependencies)

**Backend:**
- Cloudflare Workers (serverless)
- D1 SQLite database
- SHA-256 password hashing
- Rate limiting & input validation

**Deployment:**
- Frontend: Cloudflare Pages (or any static host)
- Backend: Cloudflare Workers
- Cost: $0/month (free tier)

## Repository

- **GitHub**: [RetroLancers/milo_site](https://github.com/RetroLancers/milo_site)
- **Branch**: `main`

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Step-by-step deployment guide
- [CLAUDE.md](CLAUDE.md) - Development guide for Claude Code
- [worker/README.md](worker/README.md) - Worker-specific documentation

## License

All rights reserved © Milo Beckman
