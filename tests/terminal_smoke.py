"""Run the actual terminal process through join, recruitment and clean leave."""
import importlib.util
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
ROOT=Path(__file__).resolve().parents[1]

def main():
    """Own one temporary bot host and verify the terminal mutates its real state."""
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    url=f'http://127.0.0.1:{port}'
    server=subprocess.Popen(['node','javascript/server.mjs','--bot'],cwd=ROOT,
                            env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try: urllib.request.urlopen(url,timeout=1).close(); break
            except OSError: time.sleep(.1)
        result=subprocess.run(['python3','python/lan_client.py','--host',url],cwd=ROOT,
                              input='train soldier\nquit\n',capture_output=True,text=True,timeout=10)
        assert result.returncode==0,result.stderr
        spec=importlib.util.spec_from_file_location('lan',ROOT/'python/lan_client.py')
        lan=importlib.util.module_from_spec(spec);spec.loader.exec_module(lan)
        session=lan.post(url,'/join',{'code':'glyph'})
        assert session['player']==0,'terminal did not release player slot'
        state=lan.post(url,'/state',{'token':session['token']})
        assert state['game']['credits'][0]==60,'terminal did not recruit'
        print('Terminal smoke: live join, recruit, state and leave passed')
    finally:
        server.terminate();server.wait(timeout=5)

if __name__=='__main__':main()
