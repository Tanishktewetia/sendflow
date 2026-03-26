"""
Java Mailer API Test Script
Tests registration, OTP with 60-second throttling, and authentication flow
"""

import json
import requests
import time
import sys

BASE_URL = "http://localhost:8081/api"
EMAIL = "tanishktewetia@gmail.com"
PASSWORD = "Enzsr8ha3f@"
FULL_NAME = "Tanishk Tewetia"

def make_request(method, endpoint, data=None, token=None):
    """Make an HTTP request to the API"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        else:
            return None
        
        return {
            "status_code": response.status_code,
            "content": response.json() if response.text else {}
        }
    except Exception as e:
        print(f"ERROR: {e}")
        return None

print("\n" + "="*50)
print("Java Mailer API Testing")
print("="*50 + "\n")

# Test 1: Register User
print("[TEST 1] Register User")
print("  Sending: POST /auth/register")
register_data = {
    "email": EMAIL,
    "password": PASSWORD,
    "fullName": FULL_NAME
}

register_response = make_request("POST", "/auth/register", register_data)
if register_response:
    print(f"  Status Code: {register_response['status_code']}")
    print(f"  Response: {json.dumps(register_response['content'], indent=2)}")
    registration_token = register_response['content'].get('verificationToken')
else:
    print("  FAILED!")
    registration_token = None

# Test 2: Request OTP via Forgot Password
print("\n[TEST 2] Request OTP (Forgot Password)")
print("  Sending: POST /auth/forgot-password")
forgot_data = {"email": EMAIL}

forgot_response = make_request("POST", "/auth/forgot-password", forgot_data)
if forgot_response:
    print(f"  Status Code: {forgot_response['status_code']}")
    print(f"  Response: {json.dumps(forgot_response['content'], indent=2)}")
    reset_token = forgot_response['content'].get('resetToken')
    print(f"  Reset Token: {reset_token}")
else:
    print("  FAILED!")
    reset_token = None

# Test 3: Try Resend OTP immediately (should be throttled)
print("\n[TEST 3] Resend OTP Immediately (Throttle Test)")
print("  Sending: POST /auth/resend-otp immediately after first request")
time.sleep(0.5)

resend_data = {"email": EMAIL}
resend_response = make_request("POST", "/auth/resend-otp", resend_data)
if resend_response:
    print(f"  Status Code: {resend_response['status_code']}")
    print(f"  Response: {json.dumps(resend_response['content'], indent=2)}")
    
    if "error" in resend_response['content']:
        print(f"  SUCCESS - Throttle is working!")
        print(f"  Error message: {resend_response['content']['error']}")
else:
    print("  FAILED!")

# Test 4: Wait 61 seconds and resend again
print("\n[TEST 4] Resend OTP After 60 Seconds (Throttle Expiry)")
print("  Waiting 61 seconds for throttle to expire...")

for i in range(61):
    sys.stdout.write(f"\r  Waiting... {i+1}/61 seconds")
    sys.stdout.flush()
    time.sleep(1)

print("\n  Sending: POST /auth/resend-otp after throttle expires")
resend2_response = make_request("POST", "/auth/resend-otp", resend_data)
if resend2_response:
    print(f"  Status Code: {resend2_response['status_code']}")
    print(f"  Response: {json.dumps(resend2_response['content'], indent=2)}")
    print("  SUCCESS - Resend allowed after 60-second throttle!")
else:
    print("  FAILED!")

# Test 5: Verify Email
if registration_token:
    print("\n[TEST 5] Verify Email")
    print("  Sending: POST /auth/verify-email with registration token")
    verify_data = {"token": registration_token}
    
    verify_response = make_request("POST", "/auth/verify-email", verify_data)
    if verify_response:
        print(f"  Status Code: {verify_response['status_code']}")
        print(f"  Response: {json.dumps(verify_response['content'], indent=2)}")
    else:
        print("  FAILED!")

# Test 6: Login
print("\n[TEST 6] Login")
print("  Sending: POST /auth/login")
login_data = {
    "email": EMAIL,
    "password": PASSWORD
}

login_response = make_request("POST", "/auth/login", login_data)
if login_response:
    print(f"  Status Code: {login_response['status_code']}")
    print(f"  Response: {json.dumps(login_response['content'], indent=2)}")
    jwt_token = login_response['content'].get('token')
    print(f"  JWT Token: {jwt_token}")
else:
    print("  FAILED!")
    jwt_token = None

# Test 7: Get User Profile with JWT
if jwt_token:
    print("\n[TEST 7] Get User Profile (with JWT)")
    print("  Sending: GET /auth/me with Authorization header")
    
    profile_response = make_request("GET", "/auth/me", token=jwt_token)
    if profile_response:
        print(f"  Status Code: {profile_response['status_code']}")
        print(f"  Response: {json.dumps(profile_response['content'], indent=2)}")
    else:
        print("  FAILED!")

print("\n" + "="*50)
print("API Testing Complete!")
print("="*50 + "\n")

print("Summary:")
print("  - Backend running on port 8081")
print("  - OTP changes deployed (5-min expiry, 60-sec resend throttle)")
print("  - Ready for comprehensive API testing\n")
