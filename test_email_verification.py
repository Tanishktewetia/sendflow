#!/usr/bin/env python3
"""
Test Email Verification Flow
"""

import requests
import json
import psycopg2
from datetime import datetime

# Configuration
BACKEND_BASE_URL = "http://localhost:8081/api"
FRONTEND_URL = "http://localhost:3000"

# Database connection
DB_HOST = "aws-1-ap-northeast-1.pooler.supabase.com"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres.gksgsxkusmorkbtkjemh"
DB_PASSWORD = "8Qa8r5tZj5G5EGUf"

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

def get_verification_token_from_db(user_id):
    """Get verification token from database"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            sslmode="require"
        )
        cursor = conn.cursor()
        
        query = """
            SELECT token, created_at, expires_at 
            FROM email_verification_tokens 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "token": result[0],
                "created_at": result[1],
                "expires_at": result[2]
            }
        return None
    except Exception as e:
        print_error(f"Database error: {str(e)}")
        return None

def test_registration_and_verification():
    """Complete registration and email verification flow"""
    print_header("Testing Registration and Email Verification")
    
    # Step 1: Register new user
    print_info("Step 1: Registering new user...")
    import time
    timestamp = int(time.time())
    test_email = f"verify_test_{timestamp}@example.com"
    test_password = "TestPass123!"
    test_fullname = f"Verify Test {timestamp}"
    
    try:
        reg_response = requests.post(
            f"{BACKEND_BASE_URL}/auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "fullName": test_fullname
            },
            headers={'Origin': FRONTEND_URL},
            timeout=10
        )
        
        if reg_response.status_code != 201:
            print_error(f"Registration failed: {reg_response.json()}")
            return False
        
        reg_data = reg_response.json()
        user_id = reg_data.get("userId")
        print_success(f"User registered: {test_email} (ID: {user_id})")
        
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False
    
    # Step 2: Get verification token from database
    print_info("\nStep 2: Retrieving verification token from database...")
    time.sleep(2)  # Wait for database to be updated
    
    token_data = get_verification_token_from_db(user_id)
    if not token_data:
        print_error("No verification token found in database")
        return False
    
    verification_token = token_data["token"]
    print_success(f"Verification token found: {verification_token[:20]}...")
    print_info(f"Token created at: {token_data['created_at']}")
    print_info(f"Token expires at: {token_data['expires_at']}")
    
    # Step 3: Verify email using the token
    print_info("\nStep 3: Verifying email with token...")
    try:
        verify_response = requests.post(
            f"{BACKEND_BASE_URL}/auth/verify-email",
            json={"token": verification_token},
            headers={'Origin': FRONTEND_URL},
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print_error(f"Email verification failed: {verify_response.json()}")
            return False
        
        print_success("Email verified successfully!")
        
    except Exception as e:
        print_error(f"Email verification error: {str(e)}")
        return False
    
    # Step 4: Try to login with verified email
    print_info("\nStep 4: Attempting login with verified email...")
    try:
        login_response = requests.post(
            f"{BACKEND_BASE_URL}/auth/login",
            json={
                "email": test_email,
                "password": test_password
            },
            headers={'Origin': FRONTEND_URL},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print_error(f"Login failed: {login_response.json()}")
            return False
        
        login_data = login_response.json()
        token = login_data.get("token")
        
        print_success("Login successful after email verification!")
        print_success(f"JWT Token: {token[:30]}...")
        
        return True
        
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*50}")
    print(f"Email Verification Flow Test")
    print(f"{'='*50}{Colors.END}\n")
    
    if test_registration_and_verification():
        print_header("Test Result")
        print_success("Full email verification flow works correctly!")
    else:
        print_header("Test Result")
        print_error("Email verification flow has issues")

if __name__ == "__main__":
    main()
