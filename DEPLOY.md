# Deploying QRMenu to a Hostinger VPS with CloudPanel

This guide takes the app from your Laragon folder to a live HTTPS site, e.g. `https://yourdomain.com`.
Guest menus live at `https://yourdomain.com/{restaurant}` and QR codes at `https://yourdomain.com/q/{code}`.

> HTTPS is required: browsers only allow the Plate Story camera on secure pages.

---

## 1. Server & site (once)

1. **Hostinger VPS** with the *CloudPanel* template (Ubuntu). 2 vCPU / 4–8 GB RAM is plenty to start.
2. Point your domain's **A record** (and `www`) to the VPS IP.
3. In CloudPanel → **Add Site → Create a PHP Site**
   - Application: **Laravel**, PHP **8.3** or newer
   - Domain: `yourdomain.com`
   - Site user: e.g. `qrmenu` (note the password)
4. CloudPanel → **Databases → Add Database**: name `qrmenu`, user `qrmenu`, strong password.
5. CloudPanel → site → **SSL/TLS → New Let's Encrypt Certificate** (include `www`).
6. CloudPanel → site → **Settings**: set the *Root Directory* to `htdocs/yourdomain.com/public`.
7. CloudPanel → site → **PHP Settings**: `upload_max_filesize = 10M`, `post_max_size = 12M`, `memory_limit = 256M`.
8. CloudPanel → site → **Vhost**: inside the `server { … }` block add `client_max_body_size 12M;`

## 2. Upload the code

SSH in as the site user (`ssh qrmenu@your-vps-ip`), then:

```bash
cd ~/htdocs/yourdomain.com
# Option A (recommended): push the project to a private GitHub repo first, then:
git clone https://github.com/<you>/qrmenu.git .
# Option B: upload a zip of the project (without vendor/ and node_modules/) via CloudPanel's File Manager and unzip it here.
```

## 3. Install & build

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env
nano .env          # fill in the values from section 4
php artisan key:generate

# Node 22 is needed to build the front-end once per deploy (CloudPanel: Site → Node.js, or use nvm)
npm ci
npm run build

php artisan migrate --force
php artisan db:seed --class=PlanSeeder --force
php artisan storage:link
php artisan optimize
```

Create the first super admin (only once):

```bash
php artisan tinker --execute="\$u = App\Models\User::create(['name' => 'Admin', 'email' => 'you@yourdomain.com', 'password' => 'CHANGE-ME-NOW', 'email_verified_at' => now()]); \$u->forceFill(['is_super_admin' => true])->save();"
```

Log in at `/login`, then change the password immediately (Account → Security).
**Do not run the full `db:seed` in production** — it creates demo accounts with the password `password`.

## 4. Production `.env`

```dotenv
APP_NAME=QRMenu
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=qrmenu
DB_USERNAME=qrmenu
DB_PASSWORD=********

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_SCHEME=smtps
MAIL_USERNAME=no-reply@yourdomain.com
MAIL_PASSWORD=********
MAIL_FROM_ADDRESS=no-reply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

MENU_TIMEZONE=Asia/Muscat
```

After any `.env` change: `php artisan optimize`.

## 5. Scheduler (required)

The daily jobs end finished trials, handle unpaid renewals, mark overdue invoices, and (at 9:00 Muscat time) email
reminders about expiring plans and unpaid invoices plus a daily billing summary to the support email
(turn each on/off in **Admin › Settings › Billing emails**). Preview without sending: `php artisan reminders:send --dry-run`.
CloudPanel → site → **Cron Jobs → Add**:

- Schedule: every minute (`* * * * *`)
- Command: `cd /home/qrmenu/htdocs/yourdomain.com && php artisan schedule:run >> /dev/null 2>&1`

## 6. Updating the live site

```bash
cd ~/htdocs/yourdomain.com
php artisan down
git pull                       # or upload the changed files
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize
php artisan up
```

## 7. Backups

- CloudPanel → **Backups**: enable daily remote backups (e.g. to Hostinger object storage / S3 / Dropbox).
- Make sure `storage/app/public` (logos, dish photos, Plate Story images) is included, not just the database.
- Test a restore once before launch.

## 8. Launch checklist

- [ ] `APP_DEBUG=false`, `APP_ENV=production`, HTTPS certificate active
- [ ] Super admin password changed; no demo users in the database
- [ ] Brand name, logo and support email set in **Admin › Settings**
- [ ] Plans and prices reviewed in **Admin › Plans**
- [ ] Website text reviewed in **Admin › Website CMS** (English + Arabic)
- [ ] Scheduler cron added (section 5)
- [ ] Test email arrives (register a test account, use "forgot password")
- [ ] Scan a printed QR code with an iPhone and an Android phone; try Plate Story's camera
- [ ] Backups enabled and a restore tested
