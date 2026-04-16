# PinPost

Multi-tenant PWA for local service businesses (plumbers, electricians, etc.) to post job check-ins with photos to Google Business Profile, Facebook, and Instagram automatically. Clone of "Eddie's Instagram tool" — turns every completed job into a social media + GBP post that improves local SEO.

**Production URL:** https://pinpost-web-production.up.railway.app

## Tech Stack

**Server:**
- Node.js + Express 4.19
- PostgreSQL 8 (pg driver)
- JWT auth + bcryptjs
- Multer (uploads) + Sharp (image processing)
- Anthropic SDK 0.39 (Claude Sonnet 4.6)
- Axios (external APIs)

**Client:**
- React 18 + Vite 5
- React Router v6
- Tailwind CSS 3
- React Leaflet (maps)

**Deployment:** Railway (Node container + Postgres + volume for uploads)

## Architecture

```
client/
├── src/
│   ├── pages/             # Login, Register, CheckIn, Success, Dashboard,
│   │                      # Team, Settings, SuperAdmin, AuthCallback
│   ├── components/
│   └── App.jsx            # Route structure + role-based guards
└── dist/                  # Vite build output (served by Express in prod)

server/
├── index.js               # Express app, startup, DB init
├── db.js                  # pg pool + query helpers
├── schema.sql             # 4 tables: organizations, users, checkins, invites
├── middleware/            # auth.js (JWT verify), roles.js
├── routes/
│   ├── auth.js            # Login, Google OAuth, register via invite, /me
│   ├── checkins.js        # Generate description, submit, list
│   ├── admin.js           # Team mgmt, GBP config, Meta OAuth
│   └── superadmin.js      # Org CRUD
└── services/
    ├── claude.js          # generateDescription()
    ├── gbp.js             # GBP OAuth + posting
    ├── meta.js            # Facebook/Instagram OAuth + posting
    └── image.js           # Sharp-based collage generation
```

## Data Model

**organizations** — one row per customer business. Holds GBP + Meta OAuth tokens.
**users** — super_admin | admin | worker. Belongs to org.
**checkins** — address, lat/lng, description, photo_paths[], collage_path, + status/error for each of (gbp, fb, ig).
**invites** — 7-day worker invite tokens.

## Key Flows

### Check-in (worker)
1. Opens /checkin on phone
2. Taps "Get GPS" → browser geolocation → OpenStreetMap Nominatim reverse geocode → address auto-filled
3. Taps "Generate with AI" → Claude generates 2-3 sentence professional post
4. Uploads 2+ photos (first two labeled "Before", rest "After")
5. Submits → server saves checkin row, generates collage via Sharp
6. Server fires (fire-and-forget):
   - GBP post via Google Business Profile API
   - Facebook post via Meta Graph API
   - Instagram post via Meta Graph API
7. Status stored per-platform on checkin row

### Admin setup
1. Admin signs in with Google → OAuth tokens stored on org
2. Goes to /settings → picks GBP account + location
3. Optionally connects Meta (Facebook Page + IG Business Account)
4. Invites workers via 7-day invite link

### Super admin (platform)
- Create new client orgs (trial/active/suspended)
- View counts + stats
- Suspend/delete orgs

## All Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/login | — | Email/password → JWT |
| GET | /api/auth/google | — | Redirect to Google OAuth |
| GET | /api/auth/google/callback | — | OAuth callback, store tokens |
| GET | /api/auth/me | JWT | Current user + org |
| POST | /api/auth/register | — | Accept invite, create worker |
| POST | /api/checkins/generate-description | JWT | Claude generates post text |
| POST | /api/checkins | JWT | Submit check-in |
| GET | /api/checkins | JWT | List org's check-ins (100) |
| GET | /api/admin/team | admin | List team |
| POST | /api/admin/team | admin | Add worker |
| POST | /api/admin/team/invite | admin | Generate invite link |
| DELETE | /api/admin/team/:id | admin | Deactivate worker |
| GET | /api/admin/gbp/accounts | admin | List GBP accounts |
| GET | /api/admin/gbp/locations/:accountId | admin | List locations |
| POST | /api/admin/gbp/location | admin | Save selected GBP location |
| GET | /api/admin/meta/connect | admin | Meta OAuth start |
| GET | /api/admin/meta/callback | admin | Meta OAuth callback |
| GET | /api/superadmin/orgs | super_admin | List all orgs |
| POST | /api/superadmin/orgs | super_admin | Create org + admin |
| PATCH | /api/superadmin/orgs/:id/status | super_admin | Change status |
| DELETE | /api/superadmin/orgs/:id | super_admin | Delete org |

## Known Gaps / TODOs

**Blocking launch:**
- [ ] `ANTHROPIC_API_KEY` not set in production (AI description will fail)
- [ ] `META_APP_ID` + `META_APP_SECRET` not set (Facebook/Instagram posting disabled)

**Functional gaps:**
- [ ] Collage has no "Before"/"After" text labels — Sharp needs a text overlay lib (node-canvas or @jimp/plugin-text)
- [ ] Social posts are fire-and-forget — no retry queue, no status re-check
- [ ] No service worker (PWA branding but not actually offline-capable)
- [ ] No image MIME validation (Sharp fails silently on bad files)
- [ ] No rate limiting on any endpoint
- [ ] Dashboard only shows first photo; `photo_paths[1..]` ignored in list view

**Nice-to-haves:**
- [ ] Retry UI for failed posts
- [ ] Post scheduling
- [ ] Hashtag/keyword suggestions based on service area
- [ ] Audit log
- [ ] Bulk CSV check-in import
- [ ] Engagement analytics

## Commands

```bash
# Local dev
npm run dev              # runs server/index.js (expects Postgres via DATABASE_URL)

# Build
npm run build            # builds Vite client to client/dist/

# Production (Railway)
npm start                # node server/index.js
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ANTHROPIC_API_KEY=sk-...       # MISSING in prod
APP_URL=https://pinpost-web-production.up.railway.app
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...

# For Facebook/Instagram
META_APP_ID=...                # MISSING in prod
META_APP_SECRET=...            # MISSING in prod
```

## Deployment Notes

- Railway `railway.toml`: build → `npm run build`, start → `npm start`, volume mount at `/app/uploads`
- Postgres is Railway-managed (internal .railway.internal hostname)
- DB init runs on every boot with 5-attempt retry
- Super admin auto-created from env vars on first boot

## Knowledge Base
For strategy decisions (marketing, pricing, scaling, tech stack), consult playbooks at:
`/Users/lesteroc/Library/Mobile Documents/com~apple~CloudDocs/SH/Claude/knowledge-base/playbooks/`
