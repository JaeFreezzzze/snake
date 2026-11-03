from playwright.sync_api import sync_playwright
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import atexit
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parents[1])))
Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.server_close)
atexit.register(server.shutdown)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}');page.locator('#startBtn').click()
 for i in range(4):
  page.evaluate("state='playing';food={x:snake[0].x+1,y:snake[0].y};step();if(state==='playing')state='paused'")
 assert page.evaluate("state==='draft' && choices.length===3 && new Set(choices.map(r=>r.id)).size===3")
 t=page.evaluate('playTime');page.wait_for_timeout(180);assert page.evaluate('playTime')==t
 page.keyboard.press('Escape');assert page.locator('#rogueDialog').is_visible()
 selected=page.evaluate('choices[0].id');page.keyboard.press('1');assert page.evaluate('Object.keys(build).length===1')
 assert page.evaluate("state==='route'");page.keyboard.press('1')
 page.evaluate("state='paused'")
 page.locator('#baseBtn').click();assert page.evaluate("state==='base'")
 page.keyboard.press('Escape');assert page.evaluate("state==='paused'")
 page.evaluate("shield=false;snake=[{x:23,y:8},{x:22,y:8}];direction={x:1,y:0};queue=[];state='playing';step()")
 assert page.evaluate("state==='over' && meta.cores>0 && meta.runs===1")
 amount=page.evaluate('meta.cores');page.evaluate('finish()');assert page.evaluate('meta.cores')==amount
 page.reload();assert page.evaluate('meta.cores')==amount
 page.evaluate('meta.cores=100;saveMeta()');page.locator('#baseBtn').click()
 page.locator('.relic-card').nth(0).click();assert page.evaluate('meta.upgrades.insurance===1 && meta.cores===88')
 assert page.locator('.relic-card').nth(0).is_disabled()
 page.locator('#closeRogue').click();page.locator('#restartBtn').click();assert page.evaluate('shield && Object.keys(build).length===0')
 page.reload();assert page.evaluate('shield && meta.upgrades.insurance===1')
 # Verify build effects through actual game logic.
 page.evaluate("build={greed:1};award(100)");assert page.evaluate('score===125')
 page.evaluate("build={engine:2};state='playing';activateDash();state='paused'");assert page.evaluate('dashUntil-playTime===2600 && dashReady-playTime===5500')
 page.evaluate("build={combo:1};lastMeal=playTime-4000;combo=1;food={x:snake[0].x+1,y:snake[0].y};state='playing';step();state='paused'")
 assert page.evaluate('combo===2')
 page.evaluate("build={fortune:1};bonus={x:snake[0].x+1,y:snake[0].y,type:'gold',expires:10000};food={x:0,y:0};score=0;dashUntil=0;state='playing';step();state='paused'")
 assert page.evaluate('score===125')
 page.set_viewport_size({'width':390,'height':844});page.locator('#baseBtn').click()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 b.close();print('PASS: 3 distinct draft choices, frozen selection time, keyboard choice, modal escape, base pause, exactly-once settlement, currency persistence, shop purchase/cap, permanent shield, build reset and relic effects, mobile; no JS errors')
