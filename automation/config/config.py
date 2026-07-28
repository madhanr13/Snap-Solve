import os

class Config:
    """Configuration helper for SnapSolve E2E Test Suite"""
    BASE_URL = os.getenv("BASE_URL", "https://madhanr13.github.io/Snap-Solve/")
    TIMEOUT = int(os.getenv("SELENIUM_TIMEOUT", "10"))
    HEADLESS = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")
    BROWSER = os.getenv("SELENIUM_BROWSER", "chrome").lower()
