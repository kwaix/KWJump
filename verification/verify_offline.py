
from playwright.sync_api import sync_playwright
import time

def verify_offline_reason():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mock geolocation to avoid popup permissions (optional but good practice)
        context = browser.new_context(permissions=[])
        page = context.new_page()

        # Navigate to the local server
        page.goto("http://localhost:5173")

        # Wait for initialization
        time.sleep(2)

        # Capture console logs to check for our specific warning
        # Since we can't easily capture past console logs in Playwright without event listener setup *before* logs happen,
        # we will set up the listener now and reload.

        logs = []
        page.on("console", lambda msg: logs.append(msg.text))

        page.reload()
        time.sleep(2)

        # Take a screenshot of the start screen
        page.screenshot(path="verification/offline_mode.png")

        # Check logs for the expected warning
        found_warning = False
        for log in logs:
            if "Supabase integration disabled. Running in Offline Mode" in log:
                found_warning = True
                print(f"Found warning: {log}")
            if "Supabase Offline Reason:" in log:
                print(f"Found exposed reason: {log}")

        # Check if window.supabaseOfflineReason is set
        offline_reason = page.evaluate("window.supabaseOfflineReason")
        print(f"window.supabaseOfflineReason: {offline_reason}")

        if found_warning and offline_reason:
            print("Verification SUCCESS: Offline warning logged and reason exposed.")
        else:
            print("Verification FAILED: Warning not found or reason not exposed.")

        browser.close()

if __name__ == "__main__":
    verify_offline_reason()
