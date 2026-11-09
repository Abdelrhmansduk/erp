import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchDashboard() {
  try {
    console.log('Fetching initial page to retrieve CSRF token...');
    let cookieHeader = '';

    const initialRes = await fetch('https://clickerp.com.sa/public/index.php/dashboard');
    const setCookies = initialRes.headers.getSetCookie ? initialRes.headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
    }

    const htmlText = await initialRes.text();
    const tokenMatch = htmlText.match(/name="_token"\s+value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : '';
    console.log('CSRF Token:', token);

    const postParams = new URLSearchParams({
      login: process.env.ERP_LOGIN || '',
      password: process.env.ERP_PASS || '',
      _token: token
    });

    console.log('Logging in...');
    const loginRes = await fetch('https://clickerp.com.sa/public/index.php/dashboard/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: postParams.toString()
    });

    const loginSetCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
    if (loginSetCookies.length > 0) {
      const newCookies = loginSetCookies.map(c => c.split(';')[0]).join('; ');
      cookieHeader = cookieHeader ? `${cookieHeader}; ${newCookies}` : newCookies;
    }

    const loginText = await loginRes.text();
    console.log('Login Response:', loginText.substring(0, 200));

    console.log('Fetching dashboard contents...');
    const dashRes = await fetch('https://clickerp.com.sa/public/index.php/dashboard', {
      headers: {
        'Cookie': cookieHeader
      }
    });

    const dashHtml = await dashRes.text();
    const outputPath = path.join(__dirname, 'dash.html');
    fs.writeFileSync(outputPath, dashHtml, 'utf-8');
    console.log(`Saved dashboard HTML successfully to ${outputPath}`);
  } catch (err) {
    console.error('Error in fetchDashboard:', err);
  }
}

fetchDashboard();

