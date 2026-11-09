# QRMenu

Bilingual QR menus, customer feedback, Plate Story and Google reviews for restaurants.
Laravel 13 · Inertia 3 · React 19 · Tailwind 4 · MySQL 8.

## First-time setup (Laragon on Windows)

1. Start Laragon (Apache/Nginx + MySQL). In HeidiSQL or Laragon › Database, create a database named `qrmenu` (utf8mb4).
2. Open Laragon's Terminal in this folder and run:

   ```bash
   composer install
   copy .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   npm install
   npm run dev
   ```

3. Open http://qrmenu.test (Laragon creates the host automatically; restart Laragon if it doesn't resolve).

### Logins created by the seeder

| Who | Email | Password |
| --- | --- | --- |
| Super admin | `admin@qrmenu.test` | `password` |
| Demo restaurant owner (Bait Al Saffron) | `owner@qrmenu.test` | `password` |

Change both passwords (Settings › Password) before deploying anywhere public.

## Running tests

```bash
php artisan test
```

## How it is organised

| Area | URL | Who |
| --- | --- | --- |
| Super admin | `/admin` | users with `is_super_admin = 1` |
| Restaurant dashboard | `/app` | restaurant owners, managers, editors |
| Onboarding | `/onboarding` | newly registered users with no restaurant |
| Customer menu | `/{restaurant-slug}` | guests, no login |
| Public website | `/`, `/clients`, `/blog` | everyone (edited in Admin › Website CMS) |

**Tenant isolation.** Every restaurant-owned model uses `App\Models\Concerns\BelongsToRestaurant`.
Inside `/app`, the `restaurant` middleware sets the current restaurant and all queries are
automatically limited to it; new records are stamped with its id. Super-admin code is not scoped.

**Roles** live on the `restaurant_user` pivot (`owner`, `manager`, `editor`) — see
`App\Enums\RestaurantRole` and the abilities registered in `AppServiceProvider`
(`Gate::authorize('manage-menu')` etc.).

**Translations** are JSON columns (`{"en": "...", "ar": "..."}`) via `HasTranslations`.
Prices are `decimal(10,3)` so OMR/KWD/BHD's three decimals are exact.

## Milestones

1. ✅ Foundation — schema, tenancy, roles, onboarding, super-admin plans / restaurants / brand settings
2. ✅ Restaurant & menu management — profile & Google link, branches, menu builder (categories, dishes, sizes/extras, photos, labels, languages, currency, theme, live preview)
3. ✅ CSV / Excel import & export — template, column matching (EN/AR headers), preview, add / update / add-&-update, error report, history, export
4. ✅ QR codes (branch + table, PNG/SVG, logo, print cards) & customer menu (EN/AR + RTL, themes, search, item details, feedback, Google review, scan analytics)
5. ✅ Feedback dashboard + low-rating email alerts, Plate Story (guest story cards, rewards, photo approval), analytics, super-admin finance
6. ✅ Website (Home, Our clients, Blog — EN/AR, GSAP + Lenis animations), Website CMS + blog editor, security headers, subscription expiry job, deployment guide (DEPLOY.md)
7. ✅ Staff (invites & roles), Billing (plan, usage, invoices, plan-change requests), pricing → sign-up plan pre-selection, super-admin Users & Global analytics, Marketplace (Discover page) with paid ads

## Staff & billing

- **Staff** (`/app/staff`, owners only): invite by email as Owner, Manager or Editor. New people get a “set your
  password” email; people with an account just sign in. Without the *Staff roles* plan feature a restaurant can
  have 2 team members (owner + 1). The last owner can’t be removed or demoted.
- **Billing** (`/app/billing`): current plan, renewal date, usage against plan limits, invoices (printable), and a
  “change plan” request. Requests are emailed to the support email (Admin › Settings) and listed at the top of
  **Admin › Finance**, where you record the payment (which extends the subscription) and mark the request handled.

## When a plan ends

| Step | What happens |
| --- | --- |
| 7, 3, 1 days before | Owner is emailed; a notice shows in the dashboard |
| Trial end date | Menu goes offline at once (no grace period for trials) |
| Paid plan end date | “Payment due”: menu stays online for a 7-day grace period |
| After the grace period | Menu offline (“menu unavailable” for guests); hidden from Discover / Our clients; dashboard **read-only** — pages open, menu export and Billing work, nothing else can be changed |
| 14 days offline | “Your menu is still here” win-back email |
| 60 and 85 days offline | Deletion warnings to the owner |
| 90 days offline | Restaurant permanently deleted (at least 5 days after the last warning). Invoices stay in Finance; user accounts are kept |

Renewing at any point (Admin › Finance › record payment with “extend subscription”) brings everything back instantly and
stops the clock. Win-back and automatic deletion can be switched off in **Admin › Settings › Billing emails**.

## Marketplace & ads

The public **Discover** page (`/marketplace`) lists restaurants that opted in (Profile › Marketplace) and whose
menu is live. Guests search by name, cuisine or area, filter by city and type, and sort by:

- **Top rated** — from guest feedback on the platform (at least 3 ratings; otherwise shown as “New”);
- **Nearest** — the guest’s location vs. branch latitude/longitude (set in Branches);
- **Newest**.

Paid placements are managed in **Admin › Marketplace & ads**: a top **banner**, **sponsored** listings (pinned first,
max 3), **sidebar** ads and **offer** badges on a listing — each with dates, optional city targeting and price.
Creating a campaign can also create its advertising invoice in Finance. Impressions count once per visitor per day
and clicks go through `/ads/{id}/click`; bots are ignored. Visits from the Discover page show as source
“Marketplace” in each restaurant’s analytics.


## Low-rating alerts

Restaurants choose a threshold and an alert email on **Feedback → Instant low-rating alerts**. If the email is
left empty, alerts go to the restaurant's owners. Emails are sent as soon as mail is configured in `.env`
(`MAIL_MAILER=smtp`, `MAIL_HOST`, …). Locally the default `MAIL_MAILER=log` only writes them to
`storage/logs/laravel.log`.

Alerts are sent right after the guest’s request finishes, so no queue worker is needed.

## Plate Story

Guests tap the camera button on the menu, photograph their dish (and optionally the empty plate), pick a card
design and share a 1080×1920 story image through the phone’s share sheet (Instagram → Story, WhatsApp, …).
Rewards are optional and only for sharing — never tied to reviews or ratings. Photos appear on the dish in the
menu only after the restaurant approves them.

**Storage:** the story card is made and shared on the guest's phone and is never uploaded. Photos are uploaded as
1080px WebP (≈100–150 KB) and re-encoded on the server, which also strips hidden data such as GPS location. Every night
`plate-stories:cleanup` deletes photos of stories hidden for 7+ days, never approved within 30 days, and approved ones
beyond the newest 12 per dish (the story rows stay for statistics), then measures disk use per restaurant
(Admin › Global analytics). Preview with `php artisan plate-stories:cleanup --dry-run`.


## Deployment

See **DEPLOY.md** for the Hostinger VPS + CloudPanel guide (HTTPS, production `.env`, scheduler cron, backups,
launch checklist). The scheduler runs `subscriptions:sync` daily: trials end, unpaid renewals get a 7-day grace
period, then the guest menu goes offline until the super admin records a payment in Finance.
