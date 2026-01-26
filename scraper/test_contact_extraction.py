from app.utils.email_extractor import EmailExtractor

# Mock Data based on API Report
mock_profile = {
    "biography": "Call us at +1-555-0199 for reservations!",
    "contact_phone_number": "+15550199",
    "public_email": "contact@pizzaplace.com",
    "category_name": "Pizza Place",
    "business_address_json": {
        "street_address": "123 Flavor St",
        "zip_code": "90210",
        "city_name": "Beverly Hills"
    }
}

def test_extraction():
    print("Testing Contact Extraction...")
    
    # Phone
    phone = EmailExtractor.extract_phone(mock_profile)
    print(f"Phone: {phone} (Expected: +15550199)")
    
    # Address
    addr = EmailExtractor.extract_address(mock_profile)
    print(f"Address: {addr} (Expected: Dict with City/Zip)")
    
    if addr:
        print(f"City: {addr.get('city_name')}")
        print(f"Zip: {addr.get('zip_code')}")

if __name__ == "__main__":
    test_extraction()
