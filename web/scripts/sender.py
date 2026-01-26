#!/usr/bin/env python3
"""
darkzBOX Standalone SMTP Email Sender

This script runs in the background and processes email campaigns.
It polls the API for running campaigns and sends emails via SMTP.

Usage:
    python sender.py [--api-url http://localhost:3000]
"""

import argparse
import smtplib
import time
import re
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: 'requests' package is required. Install it with: pip install requests")
    sys.exit(1)

# Configuration
DEFAULT_API_URL = "http://localhost:3000"
POLL_INTERVAL = 10  # seconds between API polls


def replace_variables(text: str, variables: dict) -> str:
    """Replace {{variable}} placeholders with actual values."""
    def replace_match(match):
        var_name = match.group(1)
        return str(variables.get(var_name, match.group(0)))

    return re.sub(r'\{\{(\w+)\}\}', replace_match, text)


def send_email(config: dict, to_email: str, subject: str, body: str) -> tuple[bool, str]:
    """Send an email via SMTP. Returns (success, error_message)."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{config['fromName']} <{config['fromEmail']}>" if config.get('fromName') else config['fromEmail']
        msg['To'] = to_email

        # Attach HTML body
        html_part = MIMEText(body, 'html')
        msg.attach(html_part)

        # Connect and send
        if config['smtpPort'] == 465:
            server = smtplib.SMTP_SSL(config['smtpHost'], config['smtpPort'])
        else:
            server = smtplib.SMTP(config['smtpHost'], config['smtpPort'])
            if config.get('useTls', True):
                server.starttls()

        server.login(config['smtpUser'], config['smtpPass'])
        server.sendmail(config['fromEmail'], to_email, msg.as_string())
        server.quit()

        return True, ""
    except Exception as e:
        return False, str(e)


def log_email(api_url: str, campaign_id: str, email: str, status: str, error: str = None):
    """Log email send result to the API."""
    try:
        response = requests.post(
            f"{api_url}/api/sender/log",
            json={
                "campaignId": campaign_id,
                "email": email,
                "status": status,
                "error": error
            },
            timeout=10
        )
        response.raise_for_status()
    except Exception as e:
        print(f"  [!] Failed to log email: {e}")


def process_campaigns(api_url: str):
    """Fetch and process running campaigns."""
    try:
        response = requests.get(f"{api_url}/api/sender/campaigns", timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[!] Failed to fetch campaigns: {e}")
        return

    config = data.get('config')
    campaigns = data.get('campaigns', [])

    if not config:
        return

    if not campaigns:
        return

    for campaign in campaigns:
        campaign_id = campaign['id']
        campaign_name = campaign['name']
        template = campaign['template']
        pending_leads = campaign['pendingLeads']

        if not pending_leads:
            print(f"[*] Campaign '{campaign_name}' has no pending leads")
            continue

        print(f"\n[*] Processing campaign: {campaign_name}")
        print(f"    Pending leads: {len(pending_leads)}")

        delay = config.get('delayBetween', 5)

        for lead in pending_leads:
            email = lead['email']

            # Build variables for replacement
            variables = {
                'firstName': lead.get('firstName', ''),
                'lastName': lead.get('lastName', ''),
                'company': lead.get('company', ''),
                'email': email
            }

            # Replace variables in subject and body
            subject = replace_variables(template['subject'], variables)
            body = replace_variables(template['body'], variables)

            # Send email
            print(f"    Sending to: {email}...", end=' ')
            success, error = send_email(config, email, subject, body)

            if success:
                print("SENT")
                log_email(api_url, campaign_id, email, 'SENT')
            else:
                print(f"FAILED - {error}")
                log_email(api_url, campaign_id, email, 'FAILED', error)

            # Delay between emails
            if delay > 0:
                time.sleep(delay)


def main():
    parser = argparse.ArgumentParser(description='darkzBOX SMTP Email Sender')
    parser.add_argument('--api-url', default=DEFAULT_API_URL, help='API base URL')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    args = parser.parse_args()

    api_url = args.api_url.rstrip('/')

    print("=" * 50)
    print("darkzBOX SMTP Email Sender")
    print("=" * 50)
    print(f"API URL: {api_url}")
    print(f"Poll Interval: {POLL_INTERVAL}s")
    print("-" * 50)

    if args.once:
        process_campaigns(api_url)
        print("\n[*] Done (single run)")
        return

    print("[*] Starting continuous mode... (Ctrl+C to stop)")

    try:
        while True:
            timestamp = datetime.now().strftime('%H:%M:%S')
            print(f"\n[{timestamp}] Checking for running campaigns...")
            process_campaigns(api_url)
            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        print("\n[*] Stopped by user")


if __name__ == '__main__':
    main()
