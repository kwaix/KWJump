from playwright.sync_api import sync_playwright

def verify_game_mobile(page):
    print("Navigating to game...")
    page.goto("http://localhost:5173/")

    # Wait for canvas to be visible
    print("Waiting for canvas...")
    page.wait_for_selector("#gameCanvas", state="visible")

    # Wait for Start Screen
    print("Waiting for start screen...")
    page.wait_for_selector("#start-screen", state="visible")

    # Screenshot Start Screen
    print("Taking screenshot of start screen...")
    page.screenshot(path="verification/mobile_start_screen.png")

    # Click start screen (it has a click listener to start game)
    print("Clicking start screen...")
    page.click("#start-screen")

    # Wait for Score HUD (indicates game started)
    print("Waiting for score HUD...")
    page.wait_for_selector("#score-hud", state="visible")

    # Screenshot Gameplay
    print("Taking screenshot of gameplay...")
    page.screenshot(path="verification/mobile_gameplay.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Simulate iPhone 12 viewport
        iphone_12 = p.devices['iPhone 12']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone_12)
        page = context.new_page()

        try:
            verify_game_mobile(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()
