@echo off
echo Starting SocialScrape Worker...
echo ONLY run this if you have Redis running in Docker!
echo.
python -m celery -A app.pipeline.CELERY_APP worker --loglevel=info --pool=solo --include=app.tiktok_pipeline
pause
