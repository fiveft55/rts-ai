"""ASCII LAN terminal client. The Node host remains the sole simulation owner."""
import argparse
import json
import queue
import threading
import time
import urllib.request


def post(host, path, data):
    """Send bounded JSON requests; HTTP failures propagate to main."""
    req = urllib.request.Request(host + path, json.dumps(data).encode(),
                                 {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=3) as response:
        return json.load(response)


def render(game, player):
    """Render a full-map snapshot with ANSI text and list owned unit IDs."""
    rows = [['.' for _ in range(40)] for _ in range(24)]
    for wall in game['walls']:
        x, y = map(int, wall.split(',')); rows[y][x] = '#'
    for ore in game['ore']:
        if ore['amount']: rows[ore['y']][ore['x']] = '$'
    for unit in game['units']:
        glyph = {'hq': 'H', 'worker': 'w', 'soldier': 's'}[unit['kind']]
        rows[unit['y']][unit['x']] = glyph if unit['p'] == player else glyph.upper()
    print('\033[H\033[2J' + '\n'.join(''.join(row) for row in rows))
    print('Player', player + 1, 'credits', game['credits'][player],
          'winner', game['winner'], 'tick', game['tick'])
    print('Your units:', [(u['id'], u['kind']) for u in game['units'] if u['p'] == player])
    print('train worker|soldier / move|gather|attack ID X Y / quit', flush=True)


def read_input(commands):
    """Read terminal input off the polling thread; EOF requests a clean leave."""
    while True:
        try: line = input()
        except EOFError: line = 'quit'
        commands.put(line)
        if line == 'quit': return


def parse_order(line):
    """Convert the documented terminal grammar to the shared JSON protocol."""
    words = line.split()
    if len(words) == 2 and words[0] == 'train':
        return {'type': 'train', 'kind': words[1]}
    if len(words) == 4 and words[0] in ('move', 'gather', 'attack'):
        return {'type': words[0], 'ids': [int(words[1])], 'x': int(words[2]), 'y': int(words[3])}
    raise ValueError('Use train KIND or move|gather|attack ID X Y')


def main():
    """Join once, poll at 2 Hz and serialize sequence-numbered commands."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='http://127.0.0.1:8080')
    parser.add_argument('--code', default='glyph')
    args = parser.parse_args()
    session = post(args.host, '/join', {'code': args.code})
    auth = {'token': session['token']}; seq = 0; commands = queue.Queue()
    threading.Thread(target=read_input, args=(commands,), daemon=True).start()
    try:
        while True:
            state = post(args.host, '/state', auth)
            render(state['game'], session['player'])
            while not commands.empty():
                line = commands.get_nowait()
                if line == 'quit': return
                try: order = parse_order(line)
                except ValueError as error: print(error); continue
                result = post(args.host, '/command', {**auth, 'seq': seq + 1, 'command': order})
                seq = result['seq']
                if not result['ok']: print('Order rejected by host')
            time.sleep(.5)
    finally:
        post(args.host, '/leave', auth)

if __name__ == '__main__':
    main()
