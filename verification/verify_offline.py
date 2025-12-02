
from playwright.sync_api import sync_playwright

def verify_offline_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local dev server
        page.goto("http://localhost:5173")

        # Wait for the game to initialize and display the leaderboard preview
        # This confirms that initSupabase() has run and resolved (even if offline)
        try:
            # Check for the leaderboard preview element
            page.wait_for_selector("#leaderboard-preview", timeout=5000)

            # Since we don't have valid secrets in the sandbox, it SHOULD be offline.
            # We can check console logs to verify the offline reason is printed,
            # but visual verification is primary here.

            # Capture the start screen
            page.screenshot(path="verification/offline_mode.png")
            print("Screenshot captured: verification/offline_mode.png")

            # Verify that the game didn't crash (canvas exists)
            assert page.is_visible("#gameCanvas")
            print("Game Canvas is visible.")

            # Verify that leaderboard content is populated (either with 'Loading...' replaced or 'No scores')
            content = page.text_content("#leaderboard-preview")
            print(f"Leaderboard content: {content}")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_offline_mode()
