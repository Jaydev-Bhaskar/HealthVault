import sys, requests

BASE_URL = 'http://localhost:5000'

def run():
    print("1. Login to get token...")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "xss_retest2@healthvault.test",
        "password": "TestPass@123"
    })
    
    if r.status_code != 200:
        print("Login failed!", r.text)
        return
        
    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("2. Add a family member...")
    r_family = requests.post(f"{BASE_URL}/api/auth/family", json={
        "name": "Jane Test",
        "bloodGroup": "O+",
        "age": 65
    }, headers=headers)
    
    # It might fail with duplicate if we run this twice, ignore if so as long as member exists
    
    print("3. Add a health record for member (Optional - just to test aggregation)...")
    member_id = r_family.json().get("_id") if r_family.status_code == 201 else None
    if member_id:
        print(f"Added member: {member_id}")
    
    print("4. Call new Caregiver Dashboard API...")
    r_dash = requests.get(f"{BASE_URL}/api/family/dashboard", headers=headers)
    
    print(f"Status CODE: {r_dash.status_code}")
    print(f"Response: {r_dash.text[:500]}") # Print first 500 chars

run()
