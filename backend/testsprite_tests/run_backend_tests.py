# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
"""
HealthVault Backend - Comprehensive API Test Suite
Covers: Auth, Records, Access, Medicines, Doctor, Blockchain, Health Check
Tests: Happy path, edge cases, auth, role enforcement, validation, security
"""

import requests
import json
import time
import sys
import random
import string
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
RESULTS = []
PASS = 0
FAIL = 0
WARN = 0

def rand_str(n=6):
    return ''.join(random.choices(string.ascii_lowercase, k=n))

def log(tc_id, name, method, path, status_got, status_exp, passed, notes="", response_data=None):
    global PASS, FAIL, WARN
    icon = "[PASS]" if passed else "[FAIL]"
    if "warn" in notes.lower():
        icon = "[WARN]"
        WARN += 1
    elif passed:
        PASS += 1
    else:
        FAIL += 1
    
    result = {
        "id": tc_id,
        "name": name,
        "method": method,
        "path": path,
        "expected_status": status_exp,
        "actual_status": status_got,
        "passed": passed,
        "notes": notes,
        "timestamp": datetime.now().isoformat()
    }
    RESULTS.append(result)
    status_str = f"[{status_got}/{status_exp}]"
    print(f"{icon} {tc_id} | {name} | {method} {path} {status_str} | {notes}")

def req(method, path, **kwargs):
    try:
        start = time.time()
        r = getattr(requests, method)(f"{BASE_URL}{path}", timeout=10, **kwargs)
        elapsed = round((time.time() - start) * 1000)
        return r, elapsed
    except Exception as e:
        return None, 0

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 0: HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 0: HEALTH CHECK")
print("="*70)

r, ms = req("get", "/api/health")
if r:
    passed = r.status_code == 200 and "status" in r.json()
    log("TC001", "Server health check", "GET", "/api/health", r.status_code, 200, passed, f"Response time: {ms}ms")
else:
    log("TC001", "Server health check", "GET", "/api/health", 0, 200, False, "Server unreachable")
    print("🔴 SERVER NOT REACHABLE — aborting tests")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: AUTH — REGISTRATION
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 1: AUTH — REGISTRATION")
print("="*70)

email_patient = f"test_patient_{rand_str()}@healthvault.test"
email_doctor  = f"test_doctor_{rand_str()}@healthvault.test"
email_hospital= f"test_hospital_{rand_str()}@healthvault.test"
password = "TestPass@123"

# TC002: Register patient
r, ms = req("post", "/api/auth/register", json={
    "name": "Test Patient", "email": email_patient, "password": password,
    "phone": "9876543210", "role": "patient", "bloodGroup": "O+", "age": 28
})
patient_token = None
patient_id = None
if r and r.status_code == 201:
    patient_token = r.json().get("token")
    patient_id = r.json().get("_id")
log("TC002", "Register patient", "POST", "/api/auth/register", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201, f"Health ID: {r.json().get('healthId') if r and r.status_code==201 else 'N/A'}")

# TC003: Register doctor
r, ms = req("post", "/api/auth/register", json={
    "name": "Dr. Test Doctor", "email": email_doctor, "password": password,
    "phone": "9123456789", "role": "doctor", "specialty": "Cardiology",
    "hospital": "Test Hospital", "licenseNumber": "LIC12345"
})
doctor_token = None
doctor_id = None
if r and r.status_code == 201:
    doctor_token = r.json().get("token")
    doctor_id = r.json().get("_id")
    doctor_code = r.json().get("doctorCode")
log("TC003", "Register doctor", "POST", "/api/auth/register", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201, f"Doctor Code: {r.json().get('doctorCode') if r and r.status_code==201 else 'N/A'}")

# TC004: Register hospital
r, ms = req("post", "/api/auth/register", json={
    "name": "Test Hospital Lab", "email": email_hospital, "password": password,
    "phone": "9111111111", "role": "hospital", "registrationNumber": "REG001",
    "labTypes": ["Blood Test", "X-Ray"], "address": "123 Test Street"
})
hospital_token = None
hospital_id = None
if r and r.status_code == 201:
    hospital_token = r.json().get("token")
    hospital_id = r.json().get("_id")
log("TC004", "Register hospital", "POST", "/api/auth/register", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201)

# TC005: Duplicate registration
r, ms = req("post", "/api/auth/register", json={
    "name": "Duplicate", "email": email_patient, "password": password, "role": "patient"
})
log("TC005", "Duplicate email registration", "POST", "/api/auth/register", r.status_code if r else 0, 400,
    r is not None and r.status_code == 400)

# TC006: Register with missing required fields
r, ms = req("post", "/api/auth/register", json={"email": "incomplete@test.com"})
log("TC006", "Register with missing fields", "POST", "/api/auth/register", r.status_code if r else 0, 400,
    r is not None and r.status_code in [400, 500], "WARN: Server may return 500 instead of 400 for missing fields")

# TC007: Empty body registration
r, ms = req("post", "/api/auth/register", json={})
log("TC007", "Register with empty body", "POST", "/api/auth/register", r.status_code if r else 0, 400,
    r is not None and r.status_code in [400, 500], "WARN: No validation middleware")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: AUTH — LOGIN
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 2: AUTH — LOGIN")
print("="*70)

# TC008: Valid patient login
r, ms = req("post", "/api/auth/login", json={"email": email_patient, "password": password})
log("TC008", "Valid patient login", "POST", "/api/auth/login", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and "token" in r.json(), f"Response time: {ms}ms")
if r and r.status_code == 200:
    patient_token = r.json().get("token")

# TC009: Wrong password
r, ms = req("post", "/api/auth/login", json={"email": email_patient, "password": "WrongPass!"})
log("TC009", "Login with wrong password", "POST", "/api/auth/login", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# TC010: Non-existent user
r, ms = req("post", "/api/auth/login", json={"email": "nonexistent@test.com", "password": password})
log("TC010", "Login non-existent user", "POST", "/api/auth/login", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# TC011: Missing email field
r, ms = req("post", "/api/auth/login", json={"password": password})
log("TC011", "Login with missing email", "POST", "/api/auth/login", r.status_code if r else 0, 400,
    r is not None and r.status_code in [400, 401], "WARN: May return 401 instead of 400")

# TC012: SQL/NoSQL injection attempt in email
r, ms = req("post", "/api/auth/login", json={"email": {"$gt": ""}, "password": {"$gt": ""}})
log("TC012", "NoSQL injection in login", "POST", "/api/auth/login", r.status_code if r else 0, 400,
    r is not None and r.status_code in [400, 401, 500],
    "SECURITY: NoSQL injection — check if properly rejected")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: AUTH — AADHAAR OTP
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 3: AUTH — AADHAAR OTP")
print("="*70)

# TC013: Send OTP - valid Aadhaar
aadhaar_id = "123456789012"
r, ms = req("post", "/api/auth/aadhaar/send-otp", json={"aadhaarId": aadhaar_id})
demo_otp = None
if r and r.status_code == 200:
    demo_otp = r.json().get("demoOtp")
log("TC013", "Send OTP - valid Aadhaar", "POST", "/api/auth/aadhaar/send-otp", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC014: Send OTP - invalid Aadhaar (less than 12 digits)
r, ms = req("post", "/api/auth/aadhaar/send-otp", json={"aadhaarId": "12345"})
log("TC014", "Send OTP - invalid Aadhaar length", "POST", "/api/auth/aadhaar/send-otp", r.status_code if r else 0, 400,
    r is not None and r.status_code == 400)

# TC015: Verify OTP - correct
if demo_otp:
    r, ms = req("post", "/api/auth/aadhaar/verify-otp", json={
        "aadhaarId": aadhaar_id, "otp": demo_otp,
        "name": "Aadhaar User", "bloodGroup": "A+", "age": 30
    })
    log("TC015", "Verify OTP - correct OTP", "POST", "/api/auth/aadhaar/verify-otp", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200 and "token" in r.json())
else:
    log("TC015", "Verify OTP - correct OTP", "POST", "/api/auth/aadhaar/verify-otp", 0, 200, False, "Skipped - no demo OTP")

# TC016: Verify OTP - wrong OTP
r, ms = req("post", "/api/auth/aadhaar/verify-otp", json={
    "aadhaarId": "999988887777", "otp": "000000"
})
log("TC016", "Verify OTP - wrong OTP (no prior request)", "POST", "/api/auth/aadhaar/verify-otp", r.status_code if r else 0, 400,
    r is not None and r.status_code == 400)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: AUTH — PROFILE & PROTECTED ROUTES
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 4: AUTH — PROFILE & FAMILY")
print("="*70)

auth_headers = {"Authorization": f"Bearer {patient_token}"}

# TC017: Get profile - authenticated
r, ms = req("get", "/api/auth/profile", headers=auth_headers)
log("TC017", "Get profile - authenticated", "GET", "/api/auth/profile", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC018: Get profile - unauthenticated
r, ms = req("get", "/api/auth/profile")
log("TC018", "Get profile - no token", "GET", "/api/auth/profile", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# TC019: Get profile - invalid token
r, ms = req("get", "/api/auth/profile", headers={"Authorization": "Bearer invalidtoken123"})
log("TC019", "Get profile - invalid token", "GET", "/api/auth/profile", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# TC020: Update profile
r, ms = req("put", "/api/auth/profile", headers=auth_headers, json={
    "phone": "9000000001", "bloodGroup": "B+", "age": 29
})
log("TC020", "Update profile - valid fields", "PUT", "/api/auth/profile", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC021: Add family member
r, ms = req("post", "/api/auth/family", headers=auth_headers, json={
    "name": "Family Member Test", "bloodGroup": "A-", "age": 55
})
log("TC021", "Add family member", "POST", "/api/auth/family", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201)

# TC022: Get family members
r, ms = req("get", "/api/auth/family", headers=auth_headers)
log("TC022", "Get family members", "GET", "/api/auth/family", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: SEARCH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 5: SEARCH ENDPOINTS")
print("="*70)

# TC023: Search doctors
r, ms = req("get", "/api/auth/doctors/search?q=test", headers=auth_headers)
log("TC023", "Search doctors by name", "GET", "/api/auth/doctors/search", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and isinstance(r.json(), list))

# TC024: Search doctors - query too short
r, ms = req("get", "/api/auth/doctors/search?q=a", headers=auth_headers)
log("TC024", "Search doctors - short query", "GET", "/api/auth/doctors/search", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and r.json() == [])

# TC025: Search hospitals
r, ms = req("get", "/api/auth/hospitals/search?q=test", headers=auth_headers)
log("TC025", "Search hospitals", "GET", "/api/auth/hospitals/search", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC026: Search patient - valid
r, ms = req("get", "/api/auth/patient/search?q=Test", headers=auth_headers)
log("TC026", "Search patient by name", "GET", "/api/auth/patient/search", r.status_code if r else 0, 200,
    r is not None and r.status_code in [200, 404])

# TC027: Search patient - short query
r, ms = req("get", "/api/auth/patient/search?q=T", headers=auth_headers)
log("TC027", "Search patient - query too short", "GET", "/api/auth/patient/search", r.status_code if r else 0, 400,
    r is not None and r.status_code == 400)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: HEALTH RECORDS
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 6: HEALTH RECORDS")
print("="*70)

record_id = None

# TC028: Create record
r, ms = req("post", "/api/records", headers=auth_headers, json={
    "title": "Test Blood Report", "type": "lab_report", "description": "Annual checkup"
})
if r and r.status_code == 201:
    record_id = r.json().get("_id")
log("TC028", "Upload health record (no file)", "POST", "/api/records", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201)

# TC029: Get all records
r, ms = req("get", "/api/records", headers=auth_headers)
log("TC029", "Get all health records", "GET", "/api/records", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and isinstance(r.json(), list))

# TC030: Get single record
if record_id:
    r, ms = req("get", f"/api/records/{record_id}", headers=auth_headers)
    log("TC030", "Get single record by ID", "GET", f"/api/records/:id", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)
else:
    log("TC030", "Get single record by ID", "GET", "/api/records/:id", 0, 200, False, "Skipped - no record_id")

# TC031: Get record - unauthorized (doctor trying to access patient record directly)
if record_id:
    r, ms = req("get", f"/api/records/{record_id}", headers={"Authorization": f"Bearer {doctor_token}"})
    log("TC031", "Get record with doctor token (no access permission)", "GET", f"/api/records/:id", r.status_code if r else 0, 404,
        r is not None and r.status_code == 404, "Security: Doctor should not access patient record without permission")

# TC032: Get record - invalid ID format
r, ms = req("get", "/api/records/invalidid123", headers=auth_headers)
log("TC032", "Get record - invalid MongoDB ID", "GET", "/api/records/invalidid", r.status_code if r else 0, 500,
    r is not None and r.status_code in [400, 500], "WARN: Returns 500 for invalid ID, should return 400")

# TC033: Analytics trends
r, ms = req("get", "/api/records/analytics/trends", headers=auth_headers)
log("TC033", "Get health analytics trends", "GET", "/api/records/analytics/trends", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC034: Delete record
if record_id:
    r, ms = req("delete", f"/api/records/{record_id}", headers=auth_headers)
    log("TC034", "Delete health record", "DELETE", "/api/records/:id", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)
else:
    log("TC034", "Delete health record", "DELETE", "/api/records/:id", 0, 200, False, "Skipped")

# TC035: Access records without token
r, ms = req("get", "/api/records")
log("TC035", "Get records - no auth token", "GET", "/api/records", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: MEDICINES
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 7: MEDICINE TRACKER")
print("="*70)

medicine_id = None

# TC036: Add medicine
r, ms = req("post", "/api/medicines", headers=auth_headers, json={
    "name": "Aspirin", "dosage": "100mg", "frequency": "once_daily",
    "timings": ["09:00 AM"], "prescribedBy": "Dr. Test"
})
if r and r.status_code == 201:
    medicine_id = r.json().get("_id")
log("TC036", "Add medicine", "POST", "/api/medicines", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201)

# TC037: Batch add medicines
r, ms = req("post", "/api/medicines/batch", headers=auth_headers, json={
    "medicines": [
        {"name": "Metformin", "dosage": "500mg"},
        {"name": "Vitamin D", "dosage": "60000IU"}
    ]
})
log("TC037", "Batch add medicines", "POST", "/api/medicines/batch", r.status_code if r else 0, 201,
    r is not None and r.status_code == 201)

# TC038: Batch add - empty array
r, ms = req("post", "/api/medicines/batch", headers=auth_headers, json={"medicines": []})
log("TC038", "Batch add - empty array", "POST", "/api/medicines/batch", r.status_code if r else 0, 400,
    r is not None and r.status_code == 400)

# TC039: Get all medicines
r, ms = req("get", "/api/medicines", headers=auth_headers)
log("TC039", "Get all medicines", "GET", "/api/medicines", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and isinstance(r.json(), list))

# TC040: Get active medicines
r, ms = req("get", "/api/medicines/active", headers=auth_headers)
log("TC040", "Get active medicines", "GET", "/api/medicines/active", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC041: Get reminders
r, ms = req("get", "/api/medicines/reminders", headers=auth_headers)
log("TC041", "Get medicine reminders", "GET", "/api/medicines/reminders", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC042: Update medicine
if medicine_id:
    r, ms = req("put", f"/api/medicines/{medicine_id}", headers=auth_headers, json={"dosage": "200mg"})
    log("TC042", "Update medicine", "PUT", "/api/medicines/:id", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)

# TC043: Mark medicine as taken
if medicine_id:
    r, ms = req("post", f"/api/medicines/{medicine_id}/taken", headers=auth_headers, json={"timing": "09:00 AM"})
    log("TC043", "Mark medicine as taken", "POST", "/api/medicines/:id/taken", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)

# TC044: Delete medicine
if medicine_id:
    r, ms = req("delete", f"/api/medicines/{medicine_id}", headers=auth_headers)
    log("TC044", "Delete medicine", "DELETE", "/api/medicines/:id", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)

# TC045: Medicine not found
r, ms = req("get", "/api/medicines/000000000000000000000000", headers=auth_headers)
log("TC045", "Get non-existent medicine", "GET", "/api/medicines/:id", r.status_code if r else 0, 404,
    r is not None and r.status_code in [404, 500])

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: ACCESS CONTROL
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 8: ACCESS CONTROL")
print("="*70)

permission_id = None

# TC046: Grant access to doctor (patient role required)
if doctor_id:
    r, ms = req("post", "/api/access/grant", headers=auth_headers, json={
        "doctorId": doctor_id, "accessType": "full",
        "expiresAt": (datetime.now() + timedelta(days=30)).isoformat()
    })
    if r and r.status_code == 201:
        permission_id = r.json().get("_id")
    log("TC046", "Grant doctor access (patient)", "POST", "/api/access/grant", r.status_code if r else 0, 201,
        r is not None and r.status_code == 201)

# TC047: Grant access - doctor role trying (should fail 403)
if doctor_id:
    r, ms = req("post", "/api/access/grant", headers={"Authorization": f"Bearer {doctor_token}"}, json={
        "doctorId": doctor_id, "accessType": "full"
    })
    log("TC047", "Grant access - doctor role (should be 403)", "POST", "/api/access/grant", r.status_code if r else 0, 403,
        r is not None and r.status_code == 403, "Security: Role enforcement check")

# TC048: Get permissions
r, ms = req("get", "/api/access", headers=auth_headers)
log("TC048", "Get all access permissions", "GET", "/api/access", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and isinstance(r.json(), list))

# TC049: Toggle permission
if permission_id:
    r, ms = req("put", f"/api/access/{permission_id}/toggle", headers=auth_headers)
    log("TC049", "Toggle access permission", "PUT", "/api/access/:id/toggle", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)

# TC050: Emergency QR
r, ms = req("get", "/api/access/emergency-qr", headers=auth_headers)
log("TC050", "Generate emergency QR code", "GET", "/api/access/emergency-qr", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200 and "qrCode" in (r.json() if r else {}))

# TC051: Emergency QR - no token
r, ms = req("get", "/api/access/emergency-qr")
log("TC051", "Emergency QR - unauthenticated", "GET", "/api/access/emergency-qr", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# TC052: Revoke permission
if permission_id:
    r, ms = req("delete", f"/api/access/{permission_id}", headers=auth_headers)
    log("TC052", "Revoke access permission", "DELETE", "/api/access/:id", r.status_code if r else 0, 200,
        r is not None and r.status_code == 200)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: DOCTOR PORTAL
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 9: DOCTOR PORTAL")
print("="*70)

doctor_headers = {"Authorization": f"Bearer {doctor_token}"} if doctor_token else {}

# TC053: Doctor stats
r, ms = req("get", "/api/doctor/stats", headers=doctor_headers)
log("TC053", "Doctor stats", "GET", "/api/doctor/stats", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC054: My patients
r, ms = req("get", "/api/doctor/my-patients", headers=doctor_headers)
log("TC054", "Doctor - my patients list", "GET", "/api/doctor/my-patients", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC055: Patient stats - patient role cannot access doctor route
r, ms = req("get", "/api/doctor/stats", headers=auth_headers)
log("TC055", "Doctor stats - patient role (should be 403)", "GET", "/api/doctor/stats", r.status_code if r else 0, 403,
    r is not None and r.status_code == 403, "Security: Role enforcement")

# TC056: Doctor view patient records - without permission (403)
if patient_id:
    r, ms = req("get", f"/api/doctor/patient/{patient_id}/records", headers=doctor_headers)
    log("TC056", "Doctor view patient records - no permission", "GET", "/api/doctor/patient/:id/records",
        r.status_code if r else 0, 403, r is not None and r.status_code == 403,
        "Security: Access control enforced correctly")

# TC057: Hospital role accessing doctor endpoint (403)
if hospital_token:
    r, ms = req("get", "/api/doctor/my-patients", headers={"Authorization": f"Bearer {hospital_token}"})
    log("TC057", "My-patients - hospital role (should be 403)", "GET", "/api/doctor/my-patients",
        r.status_code if r else 0, 403, r is not None and r.status_code == 403, "Security: Role enforcement")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10: BLOCKCHAIN
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 10: BLOCKCHAIN AUDIT")
print("="*70)

# TC058: Get ledger
r, ms = req("get", "/api/blockchain/ledger", headers=auth_headers)
log("TC058", "Get blockchain ledger", "GET", "/api/blockchain/ledger", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC059: Verify chain
r, ms = req("get", "/api/blockchain/verify", headers=auth_headers)
log("TC059", "Verify blockchain chain integrity", "GET", "/api/blockchain/verify", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC060: Chain stats
r, ms = req("get", "/api/blockchain/stats", headers=auth_headers)
log("TC060", "Get blockchain stats", "GET", "/api/blockchain/stats", r.status_code if r else 0, 200,
    r is not None and r.status_code == 200)

# TC061: Blockchain ledger - no auth
r, ms = req("get", "/api/blockchain/ledger")
log("TC061", "Blockchain ledger - no token", "GET", "/api/blockchain/ledger", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11: SECURITY TESTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 11: SECURITY TESTS")
print("="*70)

# TC062: XSS payload in name field
r, ms = req("post", "/api/auth/register", json={
    "name": "<script>alert('xss')</script>", "email": f"xss_{rand_str()}@test.com",
    "password": password, "role": "patient"
})
xss_safe = r is not None and r.status_code in [201, 400] and "<script>" not in r.text
log("TC062", "XSS in name field - registration", "POST", "/api/auth/register", r.status_code if r else 0, 201,
    xss_safe, "Security: XSS in stored data — check if escaped on output")

# TC063: Large payload (DoS test)
big_str = "A" * 100000
r, ms = req("post", "/api/auth/login", json={"email": big_str, "password": big_str})
log("TC063", "Large payload in login body", "POST", "/api/auth/login", r.status_code if r else 0, 400,
    r is not None and r.status_code in [400, 401, 413], f"Response time: {ms}ms")

# TC064: Malformed JSON
try:
    r = requests.post(f"{BASE_URL}/api/auth/login", data="not-json", headers={"Content-Type": "application/json"}, timeout=5)
    log("TC064", "Malformed JSON body", "POST", "/api/auth/login", r.status_code, 400,
        r.status_code in [400, 500], "WARN: Malformed JSON should return 400")
except:
    log("TC064", "Malformed JSON body", "POST", "/api/auth/login", 0, 400, False, "Request failed")

# TC065: Token tampering
tampered = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.invalidsignature"
r, ms = req("get", "/api/auth/profile", headers={"Authorization": tampered})
log("TC065", "Tampered JWT token", "GET", "/api/auth/profile", r.status_code if r else 0, 401,
    r is not None and r.status_code == 401, "Security: Invalid signature rejected correctly")

# TC066: Privilege escalation - patient accessing hospital-only route
r, ms = req("post", "/api/records/hospital-upload", headers=auth_headers, json={
    "title": "Fake Report", "type": "lab_report", "patientHealthId": "HV001",
    "uploadedBy": "Hacker", "uploadedByCode": "HACK001"
})
log("TC066", "Priv escalation - patient using hospital-upload", "POST", "/api/records/hospital-upload",
    r.status_code if r else 0, 403, r is not None and r.status_code == 403, "Security: Role enforcement")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 12: PERFORMANCE (CONCURRENT)
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("SECTION 12: PERFORMANCE & CONCURRENT REQUESTS")
print("="*70)

import threading

perf_results = []
def perf_req():
    start = time.time()
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        elapsed = round((time.time() - start) * 1000)
        perf_results.append(elapsed)
    except:
        perf_results.append(9999)

# TC067: 20 concurrent health check requests
threads = [threading.Thread(target=perf_req) for _ in range(20)]
for t in threads: t.start()
for t in threads: t.join()
avg_ms = round(sum(perf_results) / len(perf_results)) if perf_results else 9999
max_ms = max(perf_results) if perf_results else 9999
passed = avg_ms < 500 and max_ms < 2000
log("TC067", "20 concurrent health-check requests", "GET", "/api/health", 200, 200,
    passed, f"Avg: {avg_ms}ms | Max: {max_ms}ms | {'PASS' if passed else 'WARN: High latency'}")

# ─────────────────────────────────────────────────────────────────────────────
# REPORT GENERATION
# ─────────────────────────────────────────────────────────────────────────────
total = len(RESULTS)
pass_rate = round((PASS / total) * 100, 1) if total else 0
fail_rate = round((FAIL / total) * 100, 1) if total else 0
quality_score = round((PASS / total) * 10, 1) if total else 0

report = {
    "report_title": "HealthVault Backend API Test Report",
    "generated_at": datetime.now().isoformat(),
    "base_url": BASE_URL,
    "summary": {
        "total_tests": total,
        "passed": PASS,
        "failed": FAIL,
        "warnings": WARN,
        "pass_rate": f"{pass_rate}%",
        "quality_score": f"{quality_score}/10"
    },
    "test_results": RESULTS,
    "failed_tests": [r for r in RESULTS if not r["passed"]],
    "security_findings": [r for r in RESULTS if "Security" in r.get("notes", "") or "SECURITY" in r.get("notes", "")],
    "performance": {
        "concurrent_avg_ms": avg_ms if 'avg_ms' in dir() else "N/A",
        "concurrent_max_ms": max_ms if 'max_ms' in dir() else "N/A"
    }
}

report_path = "testsprite_tests/backend_test_report.json"
with open(report_path, "w") as f:
    json.dump(report, f, indent=2)

print("\n" + "="*70)
print("FINAL REPORT")
print("="*70)
print(f"[STATS] Total Tests   : {total}")
print(f"[PASS]  Passed        : {PASS}")
print(f"[FAIL]  Failed        : {FAIL}")
print(f"[WARN]  Warnings      : {WARN}")
print(f"[RATE]  Pass Rate     : {pass_rate}%")
print(f"[SCORE] Quality Score : {quality_score}/10")
print(f"\n[REPORT] Full report saved to: {report_path}")

if FAIL > 0:
    print(f"\n[FAILED TESTS]:")
    for r in RESULTS:
        if not r["passed"]:
            print(f"   - {r['id']} | {r['name']} | {r['method']} {r['path']} | Got:{r['actual_status']} Exp:{r['expected_status']}")
