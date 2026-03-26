"""
Interactive Registration Test
- Registers user with provided details
- Waits for OTP from email
- Completes email verification
"""

import json
import requests
import time

BASE_URL = "http://localhost:8081/api"

# User details provided
FULL_NAME = "Tanishk"
EMAIL = "tanishktewetia@gmail.com"
PASSWORD = "Enzsr8ha3f@"

def make_request(method, endpoint, data=None):
    """Make HTTP request to API"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.request(method, url, json=data, headers=headers, timeout=10)
        return {
            "status": response.status_code,
            "data": response.json() if response.text else {}
        }
    except Exception as e:
        return {
            "status": 0,
            "data": {"error": str(e)}
        }

print("\n" + "="*70)
print("INTERACTIVE REGISTRATION TEST - Real Email Verification")
print("="*70)

# Step 1: Registration
print(f"\n[STEP 1] Registering user...")
print(f"  Full Name: {FULL_NAME}")
print(f"  Email: {EMAIL}")
print(f"  Password: {'*' * len(PASSWORD)}")

register_data = {
    "fullName": FULL_NAME,
    "email": EMAIL,
    "password": PASSWORD
}

print(f"\nRequest JSON:")
print(json.dumps(register_data, indent=2))

register_response = make_request("POST", "/auth/register", register_data)

print(f"\n✓ Response Status: {register_response['status']}")
print(f"Response JSON:")
print(json.dumps(register_response['data'], indent=2))

if register_response['status'] != 201:
    print("\n✗ Registration failed!")
    exit(1)

user_id = register_response['data'].get('userId')
verification_sent = register_response['data'].get('verificationTokenSent')

print(f"\n✅ Registration Successful!")
print(f"   User ID: {user_id}")
print(f"   Verification Email Sent: {verification_sent}")

if not verification_sent:
    print("\n⚠️  Verification email was not sent. Check email configuration.")

# Step 2: Wait for OTP email
print("\n" + "="*70)
print("[STEP 2] Waiting for Verification Email...")
print("="*70)
print(f"\n📧 A verification link has been sent to: {EMAIL}")
print("\n⏳ Please check your Gmail inbox on mobile...")
print("   Look for an email from SendFlow with subject: 'SendFlow - Verify Your Email'")
print("\n   The email will contain a verification link.")

# Give user time to check email
input("\n⏳ Press ENTER once you've found the verification email and clicked the link...")

print("\n✅ Assuming you clicked the verification link!")

# Step 3: Try to login
print("\n" + "="*70)
print("[STEP 3] Testing Login After Verification...")
print("="*70)

login_data = {
    "email": EMAIL,
    "password": PASSWORD
}

print(f"\nRequest JSON:")
print(json.dumps(login_data, indent=2))

login_response = make_request("POST", "/auth/login", login_data)

print(f"\n✓ Response Status: {login_response['status']}")
print(f"Response JSON:")
print(json.dumps(login_response['data'], indent=2))

if login_response['status'] == 200:
    jwt_token = login_response['data'].get('token')
    print(f"\n✅ Login Successful!")
    print(f"   JWT Token: {jwt_token[:50]}...")
    
    # Test getting profile
    print("\n" + "="*70)
    print("[STEP 4] Getting User Profile...")
    print("="*70)
    
    headers = {"Authorization": f"Bearer {jwt_token}"}
    profile_response = make_request("GET", "/auth/me", None)
    
    print(f"\n✓ Response Status: {profile_response['status']}")
    print(f"Response JSON:")
    print(json.dumps(profile_response['data'], indent=2))
    
elif "not verified" in login_response['data'].get('error', '').lower():
    print(f"\n⚠️  Email still not verified.")
    print(f"   Try clicking the verification link again.")
else:
    print(f"\n✗ Login failed: {login_response['data'].get('error')}")

print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70 + "\n")
