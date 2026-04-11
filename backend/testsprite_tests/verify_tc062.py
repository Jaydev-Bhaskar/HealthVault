import sys, io, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = 'http://localhost:5000'

r = requests.post(f'{BASE_URL}/api/auth/register', json={
    'name': '<script>alert("xss")</script>',
    'email': 'xss_retest2@healthvault.test',
    'password': 'TestPass@123',
    'role': 'patient'
}, timeout=10)

data = r.json()
stored_name = data.get('name', '')
xss_present = '<script>' in stored_name

print(f'Status     : {r.status_code}')
print(f'Stored name: {stored_name}')
print(f'Raw <script> tag present: {xss_present}')
print()
if not xss_present:
    print('[PASS] TC062 - XSS payload sanitized correctly. Tags escaped or stripped.')
else:
    print('[FAIL] TC062 - XSS still stored unescaped')
