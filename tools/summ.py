import json,sys
rows=[json.loads(l) for l in sys.stdin if l.startswith('{')]
def cnt(k,lim): return sum(1 for r in rows if k in r and r[k]<=lim)
keys=[('o2_2',20),('land',25),('graz',30),('k2',60),('pred',60),('o2_8',70),('forest',120),('k5',260),('k6',330),('settle',9999),('era4',9999)]
print(' '.join(f"{k}<={l}:{cnt(k,l)}/{len(rows)}" for k,l in keys))
for k in ['o2_2','land','graz','k2','pred','o2_8','forest','k5','k6','era4']:
  v=[r.get(k,'-') for r in rows]; print(f"  {k:7}",v)
for k in ['sp100','hill100','spEnd','collapse','forestCells','kMax','o2End','ms']:
  print(f"  {k:7}",[r.get(k) for r in rows])
