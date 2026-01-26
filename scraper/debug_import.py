import sys
import os

sys.path.append(os.getcwd())

try:
    import app.pipeline
    print("Imported app.pipeline successfully.")
    print("Attributes in app.pipeline:", dir(app.pipeline))
    if hasattr(app.pipeline, 'scrape_hashtag_feed'):
        print("Found scrape_hashtag_feed.")
    else:
        print("scrape_hashtag_feed NOT found.")
except ImportError as e:
    print(f"Import failed: {e}")
except Exception as e:
    print(f"Other error: {e}")
