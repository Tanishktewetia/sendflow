"""
Test OTP endpoints after fixing @Transactional issue in SystemEmailService
"""

import json
import requests
import time

BASE_URL = "http://localhost:8081/api"
EMAIL = "otp_test_" + str(int(time.time())) + "@test.com"
PASSWORD = "TestPassword123@"

def test_endpoint(method, endpoint, data=None):
    """Make a request and display results"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.request(method, url, json=data, headers=headers, timeout=10)
        return {
            "status": response.status_code,
            "data": response.json() if response.text else {}
        }
    except Exception as e:
        return {"status": 0, "data": {"error": str(e)}}

print("\n" + "="*60)
print("OTP ENDPOINT TEST (After fixing @Transactional)")
print("="*60 + "\n")

# 1. Register
print("[1] Register user...")
resp = test_endpoint("POST", "/auth/register", {
    "email": EMAIL,
    "password": PASSWORD,
    "fullName": "Test User"
})
print(f"    Status: {resp['status']}")
if resp['status'] == 201:
    print(f"    ✓ User registered")
    user_id = resp['data'].get('userId')
else:
    print(f"    Response: {resp['data']}")

# 2. Test Forgot Password (Request OTP)
print(f"\n[2] Request OTP via Forgot Password...")
resp = test_endpoint("POST", "/auth/forgot-password", {"email": EMAIL})
print(f"    Status: {resp['status']}")
if resp['status'] == 200:
    print(f"    ✓ OTP Request SUCCESS!")
    print(f"    Response: {json.dumps(resp['data'], indent=8)}")
    reset_token = resp['data'].get('resetToken')
elif "rolled back" in str(resp['data'].get('error', '')):
    print(f"    ✗ TRANSACTION ERROR (Fix didn't work)")
    print(f"    Error: {resp['data'].get('error')}")
else:
    print(f"    Status {resp['status']}")
    print(f"    Response: {json.dumps(resp['data'], indent=8)}")

# 3. Test Resend OTP (after throttling)
print(f"\n[3] Resend OTP immediately (should be throttled)...")
resp = test_endpoint("POST", "/auth/resend-otp", {"email": EMAIL})
print(f"    Status: {resp['status']}")
if resp['status'] == 200:
    print(f"    Response: {json.dumps(resp['data'], indent=8)}")
elif "rolled back" in str(resp['data'].get('error', '')):
    print(f"    ✗ TRANSACTION ERROR")
elif "wait" in str(resp['data'].get('error', '')).lower():
    print(f"    ✓ Throttle working!")
    print(f"    Throttle message: {resp['data'].get('error')}")
else:
    print(f"    Response: {json.dumps(resp['data'], indent=8)}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60 + "\n")
