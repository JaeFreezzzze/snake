"""Integration checks using real game rules and controlled browser state."""
import atexit
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parents[1])))
Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.server_close)
atexit.register(server.shutdown)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}')
    # Existing schema-1 progress survives the new rules.
    page.evaluate("localStorage.setItem(META_KEY, JSON.stringify({version:1,cores:37,runs:2,upgrades:{reactor:1}}))")
    page.reload()
    assert page.evaluate('meta.cores===37 && meta.runs===2 && meta.upgrades.reactor===1')
    page.locator('#startBtn').click()
    page.evaluate("state='paused'")
    # Consume each stage's actual goal; safely reposition the snake between ticks.
    for stage, goal in enumerate([4, 5, 6, 7, 8]):
        for _ in range(goal):
            page.evaluate("snake=[{x:10,y:12},{x:9,y:12},{x:8,y:12},{x:7,y:12}];direction={x:1,y:0};queue=[];food={x:11,y:12};state='playing';step();if(state==='playing')state='paused'")
        assert page.evaluate(f"state==='draft' && sector==={stage+1} && completedSectors==={stage+1}")
        times = page.evaluate('[playTime,sectorTime,pulseClock]')
        page.wait_for_timeout(80)
        assert page.evaluate('[playTime,sectorTime,pulseClock]') == times
        page.keyboard.press('1')
        assert page.evaluate("state==='route'")
        page.keyboard.press('Escape')
        assert page.evaluate("state==='route'")
        page.keyboard.press('3')
        assert page.evaluate("state==='playing' && route.id==='elite'")
        page.evaluate("state='paused'")
    assert page.evaluate('routeCores===24')  # Stage 1 used Shelter; four completed Storm routes.
    page.evaluate("state='playing';sectorTime=24999;advanceExpedition(2)")
    assert page.evaluate("state==='won' && completedSectors===6 && routeCores===30")
    assert page.evaluate('runReward===111 && meta.cores===148')  # (15+24+30+20)*1.25
    page.evaluate('finish(true)')
    assert page.evaluate('meta.cores===148 && meta.runs===3')
    page.locator('#restartBtn').click()
    assert page.evaluate("sector===0 && completedSectors===0 && !pulse && Object.keys(build).length===0")
    # Generated warnings avoid the head and collectibles; one line only.
    page.evaluate("sector=1;state='playing';pulseClock=7000;advanceExpedition(1);state='paused'")
    assert page.evaluate("pulse && Math.abs(pulse.index-snake[0][pulse.axis])>3 && ![food,bonus,pickup].some(p=>p&&p[pulse.axis]===pulse.index)")
    # Amber line is safe. Red line kills; shield absorbs and removes pulse.
    setup = "snake=[{x:10,y:12},{x:9,y:12}];direction={x:1,y:0};queue=[];food={x:0,y:0};pulse={axis:'x',index:11,starts:100,ends:1000};state='playing';"
    page.evaluate(setup + "pulseClock=50;shield=false;step();state='paused'")
    assert page.evaluate('snake[0].x===11')
    page.evaluate(setup + 'pulseClock=101;shield=true;step();state=\'paused\'')
    assert page.evaluate('snake[0].x===11 && !shield && pulse===null')
    page.evaluate(setup + 'pulseClock=101;shield=false;step()')
    assert page.evaluate("state==='over'")
    # Relics have measurable, distinct consequences.
    page.evaluate("resetGame();snake=Array.from({length:14},(_,i)=>({x:i,y:12}));build={colossus:1};award(100)")
    assert page.evaluate('score===140')
    page.evaluate("trimSnake();score=0;award(100)")
    assert page.evaluate('score===128')
    page.evaluate("resetGame();state='playing';build={afterburn:2};activateDash();food={x:11,y:12};step();state='paused'")
    assert page.evaluate('dashReady===4000')  # 6500 - permanent reactor 500 - recovery 2000
    # Difficulty change settles with the old difficulty, not the selected one.
    page.evaluate("resetGame();eaten=4;mode='chill';state='paused'")
    before = page.evaluate('meta.cores')
    page.locator('[data-mode="hyper"]').click()
    assert page.evaluate('meta.cores') == before + 2
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("state='playing';completeSector();chooseRelic(0)")
    assert page.evaluate("state==='route'")
    assert page.locator('#rogueDialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors, errors
    browser.close()
print('PASS: six-stage victory, frozen drafts/routes, persistent saves, route payout, pulse warning/collision/shield, relic tradeoffs, old-difficulty settlement, mobile dialogs; no JS errors')
