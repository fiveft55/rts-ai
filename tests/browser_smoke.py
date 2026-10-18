"""Exercise actual offline controls and two independent LAN browser sessions."""
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

def main():
    """Start a private temporary host, test Chromium UI, and stop owned processes."""
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    process = subprocess.Popen(['node', 'javascript/server.mjs'], cwd=ROOT,
                               env={**os.environ, 'PORT': str(port), 'ROOM_CODE': 'ui-test'},
                               stdout=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(url, timeout=1).close(); break
            except OSError: time.sleep(.1)
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            a = browser.new_page(); b = browser.new_page(); errors = []
            a.on('pageerror', lambda error: errors.append(str(error)))
            b.on('pageerror', lambda error: errors.append(str(error)))
            a.goto(url)
            expect(a.locator('#status')).to_contain_text('OFFLINE')
            a.locator('#soldier').click()
            expect(a.locator('#status')).to_contain_text('Credits 60')
            a.locator('#harvest').click()
            # Worker needs ~2 seconds to walk to the ore and start harvesting.
            a.wait_for_function("!document.querySelector('#status').textContent.includes('Credits 60')", timeout=10000)
            for page in (a,b):
                page.goto(url); page.locator('#code').fill('ui-test'); page.locator('#join').click()
            expect(a.locator('#status')).to_contain_text('LAN · Player 1')
            expect(b.locator('#status')).to_contain_text('LAN · Player 2')
            a.locator('#soldier').click()
            expect(a.locator('#status')).to_contain_text('Credits 60')
            expect(b.locator('#status')).to_contain_text('Credits 100')
            a.locator('#all').click()
            a.locator('#map').click(button='right',position={'x':700,'y':250})
            a.screenshot(path=str(ROOT/'build/browser.png'))
            a.locator('#leave').click()
            expect(a.locator('#status')).to_contain_text('OFFLINE')
            assert not errors, errors
            browser.close()
        print('Browser smoke: offline recruitment/harvest, two-player LAN, ownership, orders and leave passed')
    finally:
        process.terminate(); process.wait(timeout=10)

if __name__ == '__main__': main()
