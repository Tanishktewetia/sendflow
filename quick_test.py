"""Quick registration test"""
import requests
import json

BASE_URL = "http://localhost:8081/api"

# Test 1: Try registration
print("\n[TEST] Register User\n")
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "tanishktewetia@gmail.com",
            "password": "Enzsr8ha3f@",
            "fullName": "Tanishk Tewetia"
        },
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"ERROR: {e}\n")

# Test 2: Try forgot password
print("[TEST] Forgot Password (Request OTP)\n")
try:
    response = requests.post(
        f"{BASE_URL}/auth/forgot-password",
        json={"email": "tanishktewetia@gmail.com"},
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"ERROR: {e}\n")

# Test 3: Try login
print("[TEST] Login\n")
try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "tanishktewetia@gmail.com",
            "password": "Enzsr8ha3f@"
        },
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"ERROR: {e}\n")
