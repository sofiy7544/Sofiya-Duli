import sys, asyncio, json
from playwright.async_api import async_playwright
BASE='http://localhost:4173/'
# usage: shots.py theme:WxH:route[:action] ...
async def main(specs):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
        errors=[]
        for spec in specs:
            parts=spec.split('|'); theme, size, route = parts[0], parts[1], parts[2]; action = parts[3] if len(parts)>3 else ''
            w,h = map(int,size.split('x'))
            ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2 if w<800 else 1, is_mobile=w<800, has_touch=w<800)
            await ctx.add_init_script(f"localStorage.setItem('crm-preview-theme','{theme}')")
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None)
            await pg.goto(BASE+'#'+route); await pg.wait_for_timeout(1400)
            if action:
                for a in action.split(';'):
                    k,_,v=a.partition('=')
                    if k=='click': await pg.click(v); await pg.wait_for_timeout(700)
                    if k=='type': sel,_,txt=v.partition('>'); await pg.fill(sel, txt); await pg.wait_for_timeout(700)
                    if k=='wait': await pg.wait_for_timeout(int(v))
                    if k=='scroll': await pg.mouse.wheel(0,int(v)); await pg.wait_for_timeout(500)
                    if k=='eval': await pg.evaluate(v); await pg.wait_for_timeout(900)
            overflow = await pg.evaluate("document.documentElement.scrollWidth - innerWidth")
            name=f"/home/claude/shots/{theme}_{w}_{route.strip('/').replace('/','-') or 'root'}{('_'+action.split('=')[0]) if action else ''}.png"
            await pg.screenshot(path=name, full_page=False)
            print(name, 'overflowX=',overflow)
            await ctx.close()
        await b.close()
        print('ERRORS:', json.dumps(list(dict.fromkeys(errors))[:10], ensure_ascii=False))
asyncio.run(main(sys.argv[1:]))
