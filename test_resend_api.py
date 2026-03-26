#!/usr/bin/env python3
"""
Test Resend API Configuration
Verifies if Resend email sending is working
"""

import requests
import json

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

def test_resend_api():
    """Test Resend API with the configured credentials"""
    print_header("Testing Resend API Configuration")
    
    # Configuration from application.properties
    RESEND_API_KEY = "re_Drfb3Eq2_7a6KFTm1K4cFcDYjuJCaBSPE"
    FROM_EMAIL = "tanishktewetia@gmail.com"
    RESEND_API_URL = "https://api.resend.com/emails"
    
    print_info(f"From Email: {FROM_EMAIL}")
    print_info(f"API Key: {RESEND_API_KEY[:20]}...")
    
    # Test email details
    TEST_TO_EMAIL = "test@example.com"
    
    # Prepare request
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": FROM_EMAIL,
        "to": TEST_TO_EMAIL,
        "subject": "Test Email from Java Mailer",
        "html": "<h1>Test Email</h1><p>This is a test email from SendFlow Java Mailer.</p>"
    }
    
    print_info(f"\nSending test email to: {TEST_TO_EMAIL}")
    
    try:
        response = requests.post(
            RESEND_API_URL,
            headers=headers,
            json=payload,
            timeout=10
        )
        
        print_info(f"Response Status: {response.status_code}")
        print_info(f"Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print_success("Email sent successfully via Resend!")
            result = response.json()
            print_success(f"Email ID: {result.get('id')}")
            return True
        else:
            print_error(f"Resend API error: {response.status_code}")
            error_data = response.json()
            print_error(f"Error: {error_data.get('message', 'Unknown error')}")
            
            # Check common errors
            if "not authenticated" in str(error_data).lower() or response.status_code == 403:
                print_error("✗ API key appears to be invalid or expired")
            elif "from" in str(error_data).lower():
                print_error("✗ 'From' email address might not be verified in Resend")
            
            return False
            
    except requests.exceptions.Timeout:
        print_error("Request timeout - cannot reach Resend API")
        return False
    except requests.exceptions.ConnectionError:
        print_error("Connection error - cannot reach Resend API")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def check_from_email_validity():
    """Check if using Gmail address as sender is valid"""
    print_header("Checking From Email Configuration")
    
    FROM_EMAIL = "tanishktewetia@gmail.com"
    
    print_info(f"From Email: {FROM_EMAIL}")
    
    if "@gmail.com" in FROM_EMAIL:
        print_error("Using Gmail address as sender might cause issues")
        print_info("Resend typically requires domain-verified email addresses")
        print_info("Consider using:")
        print_info("  1. A domain email (noreply@yourdomain.com)")
        print_info("  2. A verified Resend sender identity")
        print_info("  3. Check https://dashboard.resend.com/senders for verified addresses")
        return False
    else:
        print_success("From email appears to be domain-based")
        return True

def main():
    print(f"\n{Colors.BLUE}{'='*50}")
    print(f"Resend API Diagnosis")
    print(f"{'='*50}{Colors.END}\n")
    
    # Check from email
    check_from_email_validity()
    
    # Test API
    if test_resend_api():
        print_header("Diagnosis Result")
        print_success("Resend API is configured correctly!")
        print_success("System emails should be sending properly")
    else:
        print_header("Diagnosis Result")
        print_error("Resend API configuration issue detected!")
        print_error("System emails are NOT being sent")
        print_info("\nPossible fixes:")
        print_info("1. Verify API key in application.properties")
        print_info("2. Check Resend dashboard for verification status")
        print_info("3. Ensure from-email is verified in Resend")
        print_info("4. Consider using a domain email instead of Gmail")

if __name__ == "__main__":
    main()
