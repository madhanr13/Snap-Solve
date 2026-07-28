import os
from datetime import datetime
from automation.utils.logger import log_info, log_error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCREENSHOT_DIR = os.path.join(BASE_DIR, "Test Results", "Screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def take_screenshot(driver, name):
    """
    Captures screenshot. If driver is active, saves actual screenshot.
    Otherwise, writes a placeholder indicating a simulated capture.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name}_{timestamp}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    
    if driver is not None:
        try:
            driver.save_screenshot(filepath)
            log_info(f"Captured screenshot saved to: {filepath}")
            return filepath
        except Exception as e:
            log_error(f"Failed to save driver screenshot: {e}")
            
    # Mock/simulated screenshot fallback
    try:
        with open(filepath, "w") as f:
            f.write(f"MOCK_SCREENSHOT: Simulated capture for {name} at {timestamp}")
        log_info(f"Captured simulated screenshot saved to: {filepath}")
        return filepath
    except Exception as e:
        log_error(f"Failed to write mock screenshot: {e}")
        return None
