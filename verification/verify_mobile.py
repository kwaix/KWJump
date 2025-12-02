from playwright.sync_api import sync_playwright
import time

def verify_game_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={'width': 480, 'height': 800})
        page = context.new_page()

        # Wait for dev server to start
        time.sleep(3)

        try:
            page.goto("http://localhost:5173")

            # Wait for game to initialize
            # We expect the canvas to be present
            page.wait_for_selector("#gameCanvas")

            # Take screenshot of start screen
            page.screenshot(path="verification/mobile_start_screen.png")
            print("Start screen captured.")

            # Simulate click on start screen to start game
            page.click("#start-screen")

            # Wait a bit for game loop to start
            time.sleep(1)

            # Take screenshot of gameplay
            page.screenshot(path="verification/mobile_gameplay.png")
            print("Gameplay captured.")

        except Exception as e:
            print(f"Verification failed: {e}")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_load()
