#!/usr/bin/env python3
"""
Full Stack Integration Test
Tests the complete registration and login flow
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BACKEND_BASE_URL = "http://localhost:8081/api"
FRONTEND_URL = "http://localhost:3000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}========== {text} =========={Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ {text}{Colors.END}")

def test_backend_connection() -> bool:
    """Test if backend is accessible"""
    print_header("Testing Backend Connection")
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/auth/register", timeout=5)
        print_success(f"Backend accessible on port 8081")
        return True
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend on port 8081")
        return False
    except Exception as e:
        print_error(f"Backend connection error: {str(e)}")
        return False

def test_frontend_connection() -> bool:
    """Test if frontend is accessible"""
    print_header("Testing Frontend Connection")
    try:
        response = requests.get(f"{FRONTEND_URL}/auth.html", timeout=5)
        if response.status_code == 200:
            print_success(f"Frontend accessible on port 3000")
            return True
        else:
            print_error(f"Frontend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to frontend on port 3000")
        return False
    except Exception as e:
        print_error(f"Frontend connection error: {str(e)}")
        return False

def test_cors_headers() -> bool:
    """Test if backend returns proper CORS headers"""
    print_header("Testing CORS Headers")
    try:
        headers = {
            'Origin': FRONTEND_URL,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(
            f"{BACKEND_BASE_URL}/auth/register",
            headers=headers,
            timeout=5
        )
        
        cors_origin = response.headers.get('Access-Control-Allow-Origin')
        if cors_origin:
            print_success(f"CORS headers returned: Access-Control-Allow-Origin = {cors_origin}")
            return True
        else:
            print_error(f"No CORS headers in response")
            print_info(f"Response headers: {dict(response.headers)}")
            return False
    except Exception as e:
        print_error(f"CORS test error: {str(e)}")
        return False

def test_registration() -> Dict[str, Any]:
    """Test user registration"""
    print_header("Testing User Registration")
    
    timestamp = int(time.time())
    test_email = f"test_{timestamp}@example.com"
    test_password = "TestPass123!"
    test_fullname = f"Test User {timestamp}"
    
    try:
        payload = {
            "email": test_email,
            "password": test_password,
            "fullName": test_fullname
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL
        }
        
        response = requests.post(
            f"{BACKEND_BASE_URL}/auth/register",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code in [200, 201]:
            print_success(f"Registration successful for {test_email}")
            return {
                "success": True,
                "email": test_email,
                "password": test_password,
                "fullName": test_fullname,
                "userId": response.json().get("userId"),
                "response": response.json()
            }
        else:
            print_error(f"Registration failed with status {response.status_code}")
            return {"success": False, "error": response.json()}
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return {"success": False, "error": str(e)}

def test_login(email: str, password: str) -> Dict[str, Any]:
    """Test user login"""
    print_header("Testing User Login")
    
    try:
        payload = {
            "email": email,
            "password": password
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Origin': FRONTEND_URL
        }
        
        response = requests.post(
            f"{BACKEND_BASE_URL}/auth/login",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        response_data = response.json()
        print_info(f"Response keys: {list(response_data.keys())}")
        
        if response.status_code == 200:
            token = response_data.get("token")
            print_success(f"Login successful for {email}")
            if token:
                print_success(f"JWT Token received (length: {len(token)})")
            return {
                "success": True,
                "email": email,
                "token": token,
                "refreshToken": response_data.get("refreshToken"),
                "response": response_data
            }
        else:
            error_msg = response_data.get("error", "Unknown error")
            print_error(f"Login failed: {error_msg}")
            return {"success": False, "error": error_msg}
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return {"success": False, "error": str(e)}

def main():
    print(f"\n{Colors.BLUE}{'='*50}")
    print(f"Full Stack Integration Test")
    print(f"{'='*50}{Colors.END}\n")
    
    # Test connections
    if not test_backend_connection():
        print_error("Backend not running. Please start backend with: mvn exec:java")
        return
    
    if not test_frontend_connection():
        print_error("Frontend not running. Frontend server should be on port 3000")
        return
    
    # Test CORS
    test_cors_headers()
    
    # Test registration
    reg_result = test_registration()
    if not reg_result.get("success"):
        print_error("Registration failed, skipping login test")
        return
    
    # Wait a moment
    time.sleep(1)
    
    # Test login
    login_result = test_login(reg_result["email"], reg_result["password"])
    
    # Summary
    print_header("Test Summary")
    print_success("✓ Backend connection works")
    print_success("✓ Frontend server works")
    print_success(f"✓ Registration works ({reg_result['email']})")
    if login_result.get("success"):
        print_success(f"✓ Login works")
        print_success(f"✓ JWT token generated")
    else:
        print_error(f"✗ Login failed: {login_result.get('error')}")
    
    print(f"\n{Colors.GREEN}Stack test complete!{Colors.END}\n")

if __name__ == "__main__":
    main()
