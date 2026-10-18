"""Exercise Canvas RTS through a plain static server with no Node/API backend."""
import socket
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


def main():
    """Own a static-server/browser lifecycle and assert player-visible behavior."""
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    server = subprocess.Popen(
        ['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(ROOT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try:
                urllib.request.urlopen(url + '/html/', timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            errors, requests = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: requests.append((request.method, request.url)))
            page.goto(url + '/html/index.html')
            expect(page.locator('#clock')).to_have_text('00:01', timeout=5000)
            page.locator('#pause').click()
            expect(page.locator('#status')).to_contain_text('PAUSED')
            clock = page.locator('#clock').inner_text()
            page.wait_for_timeout(1200)
            expect(page.locator('#clock')).to_have_text(clock)
            page.locator('#soldier').click()
            expect(page.locator('#credits')).to_have_text('60')
            expect(page.locator('#population')).to_have_text('4 / 60')
            page.locator('#worker').click()
            expect(page.locator('#credits')).to_have_text('30')
            expect(page.locator('#soldier')).to_be_disabled()
            page.locator('#restart').click()
            expect(page.locator('#credits')).to_have_text('100')
            expect(page.locator('#population')).to_have_text('3 / 60')
            expect(page.locator('#pause')).to_have_attribute('aria-pressed', 'false')
            page.locator('#pause').click()
            box = page.locator('#map').bounding_box()
            # Drag encloses initial blue worker (5,11) and soldier (5,13).
            def point(x, y):
                """Map logical grid coordinates to CSS-scaled Canvas coordinates."""
                return box['x'] + x / 40 * box['width'], box['y'] + y / 24 * box['height']
            page.mouse.move(*point(4, 10))
            page.mouse.down()
            page.mouse.move(*point(7, 15), steps=10)
            page.mouse.up()
            expect(page.locator('#selection')).to_have_text('2 SELECTED')
            page.mouse.click(*point(20.5, 4.5), button='right')
            # Paused status takes priority; resume to inspect rejected wall order.
            page.locator('#pause').click()
            expect(page.locator('#status')).to_contain_text('Order rejected')
            page.mouse.click(*point(10.5, 12.5), button='right')
            expect(page.locator('#status')).to_contain_text('Move / attack order issued')
            page.locator('#harvest').click()
            page.wait_for_function("Number(document.querySelector('#credits').textContent) > 100", timeout=10000)
            page.locator('#map').focus()
            page.keyboard.press('a')
            expect(page.locator('#selection')).to_have_text('1 SELECTED')
            page.keyboard.press('Space')
            expect(page.locator('#pause')).to_have_attribute('aria-pressed', 'true')
            (ROOT / 'build').mkdir(exist_ok=True)
            page.screenshot(path=str(ROOT / 'build/html-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.screenshot(path=str(ROOT / 'build/html-mobile.png'), full_page=True)
            assert not errors, errors
            assert requests and all(method == 'GET' and address.startswith(url + '/') for method, address in requests), requests
            browser.close()
        print('HTML smoke: static-only loading, recruitment, selection, orders, harvesting, pause, reset and narrow layout passed')
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    main()
