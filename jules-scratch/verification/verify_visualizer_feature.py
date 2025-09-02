from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(permissions=["microphone"])
    page = context.new_page()

    page.goto("http://127.0.0.1:5000")

    record_button = page.locator("#record-button")
    visualizer = page.locator("#visualizer")

    # --- Initial State ---
    expect(visualizer).to_be_hidden()

    # --- Start Recording ---
    record_button.click() # Start
    expect(visualizer).to_be_visible()

    page.screenshot(path="jules-scratch/verification/visualizer_visible.png")

    page.wait_for_timeout(500)

    # --- Stop Recording ---
    record_button.click() # Stop
    expect(visualizer).to_be_hidden()

    page.screenshot(path="jules-scratch/verification/visualizer_hidden.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
