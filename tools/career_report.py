import json,glob,re,sys
# Kategorie-Normierung aus categories.ts lesen
src=open('src/data/categories.ts').read()
norm={}
for m in re.finditer(r"\n  (\w+): \{\n    id: '(\w+)'.*?x0: ([\d.]+), xref: ([\d.]+), gamma: ([\d.]+)", src, re.S):
  norm[m.group(2)]=(float(m.group(3)),float(m.group(4)),float(m.group(5)))
C=[(13,'schulfest',['green']),(34,'stadtteil',['colorful']),(63,'zoocup',['foodweb']),(91,'stadt',['landscapes','green']),(119,'sonder',['rainforest']),(140,'felsen',['sturdy','colorful']),(183,'finale1',['bigstep','colorful']),(220,'land',['continents','landscapes']),(255,'bund',['web','foodweb']),(285,'gleich',['balance','sturdy']),(313,'exotik',['exotic','hot']),(341,'riesen',['giants']),(385,'finale2',['mind','web']),(425,'em',['development','colorful']),(465,'frieden',['peace','culture']),(500,'kultur',['culture','landscapes']),(551,'grandprix',['index'])]
runs={p:[json.load(open(f)) for f in glob.glob(f'/tmp/wgc/*{p}.json')] for p in ['std','good']}
def sc(cat,x,mult=1):
  x0,xr,g=norm[cat]; xr=x0+(xr-x0)*mult if False else xr*mult
  t=min(1,max(0,(x-x0)/(xr-x0))) if xr>x0 else 0; return 100*t**g
def mean(a): return sum(a)/len(a) if a else float('nan')
print(f"{'Wettb.':10} {'Kat':12} {'x std':>8} {'x gut':>8} {'Pkt std':>7} {'Pkt gut':>7} {'ref-Mult':>8}")
for d,cid,cats in C:
  for cat in cats:
    xs=[r['x'][str(d)].get(cat) for r in runs['std'] if cat in r['x'].get(str(d),{})]
    xg=[r['x'][str(d)].get(cat) for r in runs['good'] if cat in r['x'].get(str(d),{})]
    if not xs: continue
    x0,xr,g=norm[cat]
    ms,mg=mean(xs),mean(xg)
    # Multiplikator auf xref, damit gutes Spiel ~80 Punkte gibt
    need=x0+(mg-x0)/(0.8**(1/g)); mult=need/xr if xr else 1
    print(f"{cid:10} {cat:12} {ms:8.2f} {mg:8.2f} {mean([sc(cat,x) for x in xs]):7.0f} {mean([sc(cat,x) for x in xg]):7.0f} {mult:8.2f}   std-mit-Mult {mean([sc(cat,x,max(mult,0.01)) for x in xs]):4.0f}")
print('Kultur:', [r['culture'] for r in runs['std']])
print('Kultur gut:', [r['culture'] for r in runs['good']])
print('\nEmpfehlung ref-Multiplikator (Akt 1: gutes Spiel → 80; Akt 2/3: Standardspiel → 65):')
for d,cid,cats in C:
  for cat in cats:
    xs=[r['x'][str(d)].get(cat) for r in runs['std'] if cat in r['x'].get(str(d),{})]
    xg=[r['x'][str(d)].get(cat) for r in runs['good'] if cat in r['x'].get(str(d),{})]
    if not xs: continue
    x0,xr,g=norm[cat]
    base,target=(mean(xg),0.8) if d<=183 else (mean(xs),0.65)
    need=x0+(base-x0)/(target**(1/g)); mult=max(0.3,need/xr)
    print(f"  {cid:10} {cat:12} ×{mult:.2f}   → std {mean([sc(cat,x,mult) for x in xs]):3.0f} / gut {mean([sc(cat,x,mult) for x in xg]):3.0f}")
