"""
Interactive Registration Test - NEW EMAIL
- Registers user with similar details but new email
- Waits for OTP from email
- Completes email verification
"""

import json
import requests
import time
import sys

BASE_URL = "http://localhost:8081/api"

# User details provided (using new email for fresh test)
FULL_NAME = "Tanishk"
EMAIL = "tanishktewetia.otp@gmail.com"  # New test email
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
print(f"\n[STEP 1] Registering NEW USER...")
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
    print(f"   Error: {register_response['data'].get('error')}")
    sys.exit(1)

user_id = register_response['data'].get('userId')
verification_sent = register_response['data'].get('verificationTokenSent')

print(f"\n✅ Registration Successful!")
print(f"   User ID: {user_id}")
print(f"   Verification Email Sent: {verification_sent}")

# Step 2: Wait for OTP email
print("\n" + "="*70)
print("[STEP 2] Verification Email Sent")
print("="*70)
print(f"\n📧 Verification email has been sent to: {EMAIL}")
print(f"\n✅ Check your Gmail on mobile for the verification link!")
print(f"   Look for an email from SendFlow with subject: 'SendFlow - Verify Your Email'")

# User can manually verify by clicking the link
print("\n⏳ After clicking the verification link in your email, press ENTER...")
input()

print("\n✅ Assuming you clicked the verification link!")

# Step 3: Try to login
print("\n" + "="*70)
print("[STEP 3] Login After Email Verification")
print("="*70)

login_data = {
    "email": EMAIL,
    "password": PASSWORD
}

print(f"\nLogin Request JSON:")
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
    print("[STEP 4] Get User Profile (Authenticated)")
    print("="*70)
    
    profile_response = make_request("GET", "/auth/me", None)
    
    print(f"\n✓ Response Status: {profile_response['status']}")
    print(f"Response JSON:")
    print(json.dumps(profile_response['data'], indent=2))
    
elif "not verified" in login_response['data'].get('error', '').lower():
    print(f"\n⚠️  Email still not verified.")
    print(f"   Make sure to click the verification link in your email.")
else:
    print(f"\n✗ Login failed: {login_response['data'].get('error')}")

# Step 5: Test Forgot Password (OTP request)
print("\n" + "="*70)
print("[STEP 5] Test Forgot Password / OTP Request")
print("="*70)

print(f"\nRequesting password reset OTP...")
forgot_data = {"email": EMAIL}

forgot_response = make_request("POST", "/auth/forgot-password", forgot_data)

print(f"\n✓ Response Status: {forgot_response['status']}")
print(f"Response JSON:")
print(json.dumps(forgot_response['data'], indent=2))

if forgot_response['status'] == 200:
    reset_token = forgot_response['data'].get('resetToken')
    print(f"\n✅ OTP Sent Successfully!")
    print(f"   Reset Token: {reset_token[:30]}...")
    print(f"\n📧 Check your Gmail for the OTP!")
    print(f"   Subject: 'SendFlow - Password Reset OTP'")
    
    # Ask user to provide OTP
    print(f"\n⏳ Enter the OTP from your email: ", end="")
    otp_code = input().strip()
    
    if otp_code:
        print(f"\n[STEP 6] Reset Password with OTP")
        print("="*70)
        
        # Ask for new password (or use a test password)
        new_password = "NewPassword123@"
        
        reset_data = {
            "token": reset_token,
            "otp": otp_code,
            "newPassword": new_password
        }
        
        print(f"\nReset Password Request JSON:")
        print(json.dumps({
            "token": reset_token[:30] + "...",
            "otp": otp_code,
            "newPassword": "***hidden***"
        }, indent=2))
        
        reset_response = make_request("POST", "/auth/reset-password", reset_data)
        
        print(f"\n✓ Response Status: {reset_response['status']}")
        print(f"Response JSON:")
        print(json.dumps(reset_response['data'], indent=2))
        
        if reset_response['status'] == 200:
            print(f"\n✅ Password Reset Successful!")
            print(f"   You can now login with the new password")
else:
    print(f"\n⚠️  OTP Request Failed: {forgot_response['data'].get('error')}")

print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70 + "\n")
