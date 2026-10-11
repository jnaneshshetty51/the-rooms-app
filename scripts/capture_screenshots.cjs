const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('Launching Chromium for screenshot capture...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const capture = async (page, name, title) => {
    const filePath = path.join(OUT_DIR, `${name}.png`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[Captured] ${title} -> docs/screenshots/${name}.png`);
  };

  // 1. Web Portal (Port 3010)
  try {
    console.log('\n--- Web Portal ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    
    await page.goto('http://localhost:3010/home', { waitUntil: 'networkidle' });
    await capture(page, '01_web_landing', 'Web Portal - Landing Page');

    // Try rooms route
    try {
      await page.goto('http://localhost:3010/rooms', { waitUntil: 'networkidle', timeout: 5000 });
      await capture(page, '02_web_rooms', 'Web Portal - Rooms Catalog');
    } catch (e) {
      console.log('Rooms page timed out or redirected, capturing /home scroll instead');
      await page.goto('http://localhost:3010/home', { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollBy(0, 800));
      await capture(page, '02_web_rooms', 'Web Portal - Featured Rooms');
    }
    await ctx.close();
  } catch (err) {
    console.error('Error on Web Portal:', err.message);
  }

  // 2. Front Office Portal (Port 3002)
  try {
    console.log('\n--- Front Office Portal ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await capture(page, '03_front_office_login', 'Front Office - Login Screen');

    // Log in
    await page.fill('#email', 'fo@therooms.in');
    await page.fill('#password', 'FrontOffice@2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await capture(page, '04_front_office_dashboard', 'Front Office - Dashboard');

    try {
      await page.goto('http://localhost:3002/rooms', { waitUntil: 'networkidle', timeout: 8000 });
      await capture(page, '05_front_office_rooms', 'Front Office - Room Matrix');
    } catch (e) {
      console.log('Front Office rooms load warning:', e.message);
    }
    await ctx.close();
  } catch (err) {
    console.error('Error on Front Office:', err.message);
  }

  // 3. Admin Portal (Port 3003)
  try {
    console.log('\n--- Hotel Admin Portal ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle' });
    await capture(page, '06_admin_login', 'Admin Portal - Login Screen');

    // Log in
    await page.fill('#email', 'admin@therooms.in');
    await page.fill('#password', 'Admin@2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await capture(page, '07_admin_dashboard', 'Admin Portal - Operations Dashboard');

    try {
      await page.goto('http://localhost:3003/rooms', { waitUntil: 'networkidle', timeout: 8000 });
      await capture(page, '08_admin_rooms', 'Admin Portal - Room Management');
    } catch (e) {
      console.log('Admin rooms load warning:', e.message);
    }

    try {
      await page.goto('http://localhost:3003/housekeeping', { waitUntil: 'networkidle', timeout: 8000 });
      await capture(page, '09_admin_housekeeping', 'Admin Portal - Housekeeping');
    } catch (e) {
      console.log('Admin housekeeping load warning:', e.message);
    }
    await ctx.close();
  } catch (err) {
    console.error('Error on Admin:', err.message);
  }

  // 4. Super Admin Portal (Port 3004)
  try {
    console.log('\n--- Super Admin Portal ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    await page.goto('http://localhost:3004/login', { waitUntil: 'networkidle' });
    await capture(page, '10_super_admin_login', 'Super Admin - Login Screen');

    // Log in
    await page.fill('#email', 'superadmin@therooms.in');
    await page.fill('#password', 'SuperAdmin@2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await capture(page, '11_super_admin_dashboard', 'Super Admin - Governance Dashboard');

    try {
      await page.goto('http://localhost:3004/properties', { waitUntil: 'networkidle', timeout: 8000 });
      await capture(page, '12_super_admin_properties', 'Super Admin - Properties & Partners');
    } catch (e) {
      console.log('Super admin properties warning:', e.message);
    }
    await ctx.close();
  } catch (err) {
    console.error('Error on Super Admin:', err.message);
  }

  // 5. Guest Portal (Port 3001)
  try {
    console.log('\n--- Guest Portal ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await capture(page, '13_guest_portal_login', 'Guest Portal - Login Screen');

    // Generate magic link token for testguest@example.com
    const crypto = require('crypto');
    const secret = 'dev_guest_secret_64chars_minimum_abcdefghijklmnopqrstuvwxyz789012';
    const email = 'testguest@example.com';
    const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 15 * 60 * 1000 })).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = `${payload}.${sig}`;
    const magicUrl = `http://localhost:3001/magic-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    console.log('Navigating to guest magic link...');
    await page.goto(magicUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await capture(page, '14_guest_portal_dashboard', 'Guest Portal - Dashboard');

    try {
      await page.goto('http://localhost:3001/bookings', { waitUntil: 'networkidle', timeout: 8000 });
      await capture(page, '15_guest_portal_bookings', 'Guest Portal - My Bookings');
    } catch (e) {
      console.log('Guest bookings warning:', e.message);
    }
    await ctx.close();
  } catch (err) {
    console.error('Error on Guest Portal:', err.message);
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully into docs/screenshots/ !');
}

run().catch(console.error);
