from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from automation.config.config import Config
from automation.utils.logger import log_info

class BasePage:
    """Base class for all Page Objects in SnapSolve E2E Test Suite"""
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, Config.TIMEOUT)

    def navigate_to(self, url=None):
        target_url = url or Config.BASE_URL
        log_info(f"Navigating to: {target_url}")
        self.driver.get(target_url)

    def find_element(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def click_element(self, locator):
        element = self.wait.until(EC.element_to_be_clickable(locator))
        log_info(f"Clicking element with locator: {locator}")
        element.click()

    def enter_text(self, locator, text):
        element = self.find_element(locator)
        log_info(f"Entering text into element {locator}")
        element.clear()
        element.send_keys(text)

    def get_title(self):
        return self.driver.title
