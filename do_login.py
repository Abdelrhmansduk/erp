import urllib.request
import urllib.parse
import http.cookiejar
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

import os

# 1. Fetch credentials securely from environment variables
login_user = os.environ.get('ERP_LOGIN', '')
login_pass = os.environ.get('ERP_PASS', '')

# 1. Fetch token
res = opener.open('https://clickerp.com.sa/public/index.php/dashboard').read().decode('utf-8')
m = re.search(r'name="_token"\s+value="([^"]+)"', res)
token = m.group(1) if m else ''
print("Token:", token)

# 2. Login
data = urllib.parse.urlencode({
    'login': login_user,
    'password': login_pass,
    '_token': token
}).encode('utf-8')

req = urllib.request.Request(
    'https://clickerp.com.sa/public/index.php/dashboard/login',
    data=data,
    headers={'X-Requested-With': 'XMLHttpRequest'}
)

try:
    res_login = opener.open(req).read().decode('utf-8')
    print("Login response:", res_login)
    
    # 3. Fetch dashboard page
    dash = opener.open('https://clickerp.com.sa/public/index.php/dashboard').read().decode('utf-8')
    with open('c:/Users/abdo1/Downloads/ERP/dashboard_res.html', 'w', encoding='utf-8') as f:
        f.write(dash)
    print("Dashboard saved to dashboard_res.html")
except Exception as e:
    print("Error:", e)
