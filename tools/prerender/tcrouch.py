import asyncio, base64, io, json, subprocess, sys, time, os
from PIL import Image
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=sys.argv[1]; CR=sys.argv[2] if len(sys.argv)>2 else None
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8767'],cwd=HERE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']); pg=await b.new_page()
            await pg.goto('http://localhost:8767/render.html'); await pg.evaluate('window.__ready')
            await pg.evaluate("setTex({skin:'#e6b38a',hair:'#141414',shirt:'#3a4a7a',pants:'#5a3a2a',shirtUp:16})")
            if CR: await pg.evaluate(f'Object.assign(window.CR, {CR})')
            print(await pg.evaluate("Object.keys(window.__bones||{}).length"))
            ims=[]
            for a in [3.14159, 1.5708, 0.785, 4.712]:
                for clip,t,cr in [('Idle',0,0),('Idle',0,0.75),('Walk',0,0.7),('Walk',0.25,0.7),('Walk',0.5,0.7)]:
                    url=await pg.evaluate(f"renderFrame('{clip}',{t},{a},{cr})")
                    ims.append(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'))
            W=Image.new('RGBA',(128*5,128*4),(70,70,80,255))
            for i,im in enumerate(ims): W.alpha_composite(im,((i%5)*128,(i//5)*128))
            W.resize((128*5*2,128*4*2),Image.NEAREST).save(OUT)
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
