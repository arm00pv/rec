from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(permissions=["microphone"])
    page = context.new_page()

    page.goto("http://127.0.0.1:5000")

    record_button = page.locator("#record-button")
    preview_container = page.locator("#preview-container")
    process_button = page.locator("#process-button")
    discard_button = page.locator("#discard-button")

    # --- Initial State ---
    expect(record_button).to_be_visible()
    expect(preview_container).to_be_hidden()

    # --- Start and Stop Recording ---
    record_button.click() # Start
    expect(record_button).to_have_text("Stop")
    page.wait_for_timeout(1000) # Record for 1 second
    record_button.click() # Stop

    # --- Preview State ---
    expect(record_button).to_be_hidden()
    expect(preview_container).to_be_visible()
    expect(process_button).to_be_visible()
    expect(discard_button).to_be_visible()

    page.screenshot(path="jules-scratch/verification/preview_visible.png")

    # --- Discard Recording ---
    discard_button.click()

    # --- Back to Initial State ---
    expect(record_button).to_be_visible()
    expect(preview_container).to_be_hidden()
    expect(record_button).to_have_text("Record")

    page.screenshot(path="jules-scratch/verification/preview_discarded.png")


    browser.close()

with sync_playwright() as playwright:
    run(playwright)
