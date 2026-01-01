# Mobile Version Setup

The LifeBoard app includes a mobile-optimized version at `/mobile` that's designed for checking off habits throughout the day on your phone.

## Quick Access

Simply navigate to: `http://your-domain:5173/mobile` (development) or `http://your-domain/mobile` (production)

## Subdomain Setup (Optional)

If you want to access the mobile version via a subdomain like `habit.townsquare.com`, follow these steps:

### Option 1: Using Caddy (Recommended)

Add to your `Caddyfile`:

```caddy
habit.townsquare.com {
    reverse_proxy localhost:5173 {
        header_up X-Forwarded-Path /mobile
    }
    handle {
        rewrite * /mobile{uri}
        reverse_proxy localhost:5173
    }
}
```

### Option 2: Using Nginx

Add to your nginx config:

```nginx
server {
    listen 80;
    server_name habit.townsquare.com;

    location / {
        proxy_pass http://localhost:5173/mobile;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: SvelteKit Route-based (Development)

Alternatively, you can create a custom route handler:

1. Create `apps/web/src/routes/habit/+page.svelte` that redirects to `/mobile`
2. Or add DNS configuration to point `habit` subdomain to your server IP
3. Configure your reverse proxy to route `habit.*` requests to `/mobile`

## Mobile Features

The mobile version includes:
- ✅ Touch-optimized habit cards
- ✅ Large tap targets for easy checking
- ✅ Progress bars for each habit
- ✅ Streak tracking (🔥 indicator)
- ✅ Completion count for today
- ✅ Optimized for small screens
- ✅ Safe area support for notched devices

## Add to Home Screen (Progressive Web App)

### iOS (Safari)
1. Open `http://your-domain/mobile` in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The mobile version will open like a native app

### Android (Chrome)
1. Open `http://your-domain/mobile` in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home Screen"
4. The mobile version will open like a native app

## Environment Variables

If using a subdomain, make sure to update CORS_ORIGIN in your `.env`:

```bash
CORS_ORIGIN=http://townsquare.com,http://habit.townsquare.com
```

## Testing

Test the mobile version locally:
```bash
# Start the dev server
pnpm dev

# Visit in your browser
http://localhost:5173/mobile

# Or use your phone on the same network
http://YOUR_LOCAL_IP:5173/mobile
```
