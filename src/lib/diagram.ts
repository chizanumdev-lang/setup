// @ts-nocheck -- data-driven SVG builder over loosely typed tuples; covered by visual checks

// Schematic candle diagrams for each glossary term. Drawn in bullish orientation, mirrored for bearish.
import { GLOSS, sw, type Bias } from "@/lib/checklist";
/* eslint-disable @typescript-eslint/no-explicit-any */
const DIAG: any[] = [
  { c:[[70,55,72,52],[56,62,64,40],[62,86,88,60,1]], l:[[52,0,2.5,"C1 {low|high}",0,"start"]], n:[[1,28,"C2 sweeps, closes back {above|below}","middle"],[2,96,"C3 expands","middle"]] },
  { c:[[70,55,72,52],[56,50,58,38],[50,74,76,48],[74,90,92,72,1]], z:[[50,56,1,2.6,""]], l:[[52,0,1,"C1 {low|high}",0,"start","b"]], n:[[1,26,"C2: swept, no close back","middle"],[1.7,100,"C3 closes over C2 body","middle"],[3,98,"C4","middle"]] },
  { c:[[80,72,82,70],[72,62,73,60],[62,52,63,48],[52,60,62,50],[60,86,88,58]], l:[[80,0,5,"Open of {down|up}-close series",0,"start"]], n:[[2,36,"Series {low|high}","middle"],[4,96,"Close {above|below} = CISD","end"]] },
  { c:[[70,55,72,52],[55,52,56,50],[52,60,62,44],[60,80,82,58]], l:[[50,0,2.2,"Equal {lows|highs}",0,"start","b"],[40,2,3.6,"Stop",3.6,"end"]], d:[[2,44]], n:[[2,22,"Protected {low|high}","middle"]] },
  { c:[[40,50,52,38],[50,78,80,49],[70,84,86,60]], z:[[52,60,0.5,2.5,""]], n:[[0,26,"1","middle"],[1,36,"2","middle"],[2,46,"3","middle"],[1.5,96,"Wicks of 1 and 3 don't overlap","middle"],[0.55,56,"Gap","start"]] },
  { smt:1 },
  { c:[[40,82,86,36],[82,76,84,64]], l:[[61,0,2,"EQ: 50% of C3 range",0,"end","b"]], n:[[1,98,"Holds {upper|lower} half","middle"]] },
  { c:[[30,40,42,28],[40,52,54,38],[52,62,64,50],[62,70,72,60],[70,92,94,68,1]], l:[[90,0,5,"Old {high|low}: the draw",0,"start"]], n:[[4,50,"Target","middle"]] },
  { c:[[70,56,72,54],[56,48,57,44],[48,42,50,38]], l:[[52,0,3,"Level swept",0,"start","b"]], n:[[2,24,"No close back, no CISD","end"]] }
];
export function diagram(i: number, bias: Bias): string {
  const d = DIAG[i]; if (!d) return "";
  const W = 300, H = 176, top = 18, bot = 18, flip = bias === "bear";
  const y = (v: number) => flip ? top + v*(H-top-bot)/100 : H - bot - v*(H-top-bot)/100;
  let g = "";
  if (d.smt) {
    const a = [[.08,62],[.3,40],[.52,56],[.86,26]], b = [[.08,62],[.3,40],[.52,56],[.86,46]];
    const panel = (pts: number[][], ox: number, label: string) => { const px = (f: number) => ox + 10 + f*118;
      return `<polyline class="pl" points="${pts.map(([f,v]) => px(f).toFixed(1) + "," + y(flip ? 100 - v : v).toFixed(1)).join(" ")}"/>` +
        pts.filter((_,k) => k === 1 || k === 3).map(([f,v]) => `<circle class="pd" cx="${px(f)}" cy="${y(flip ? 100 - v : v)}" r="4.5"/>`).join("") +
        `<text x="${ox + 70}" y="${flip ? 12 : H - 4}" text-anchor="middle">${label}</text>`; };
    g = panel(a, 6, "NQ: new {low|high}".replace(/\{([^|}]*)\|([^}]*)\}/, (_,x,z) => flip ? z : x)) + panel(b, 156, "ES: holds");
  } else {
    const n = d.c.length, slot = (W - 28) / n, X = (i: number) => 14 + slot*(i + .5);
    (d.z || []).forEach(([v1,v2,i1,i2,lb]) => { const ya = y(v1), yb = y(v2);
      g += `<rect class="zn" x="${X(i1)}" y="${Math.min(ya,yb)}" width="${X(i2) - X(i1)}" height="${Math.abs(ya - yb)}"/>`;
      if (lb) g += `<text x="${X(i2) + 4}" y="${(ya + yb)/2 + 4}">${sw(lb, bias)}</text>`; });
    (d.l || []).forEach(([v,i1,i2,lb,lx,an,pos]) => { const x1 = i1 === 0 ? 8 : X(i1 - .5), x2 = Math.min(W - 6, X(i2 - .5));
      g += `<line class="ln" x1="${x1}" x2="${x2}" y1="${y(v)}" y2="${y(v)}"/>`;
      if (lb) g += `<text x="${an === "end" ? x2 - 2 : x1 + 2}" text-anchor="${an}" y="${y(v) + (pos === "b" ? (flip ? -4 : 12) : (flip ? 12 : -4))}">${sw(lb, bias)}</text>`; });
    d.c.forEach(([o,c,h,l,ghost], k) => { const x = X(k), yo = y(o), yc = y(c), up = yc < yo, col = ghost ? "var(--muted)" : up ? "var(--bull)" : "var(--bear)";
      if (ghost) g += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(l)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 3"/><rect class="gh" x="${x - 8}" y="${Math.min(yo,yc)}" width="16" height="${Math.max(2, Math.abs(yo - yc))}"/>`;
      else g += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(l)}" stroke="${col}" stroke-width="2"/><rect x="${x - 8}" y="${Math.min(yo,yc)}" width="16" height="${Math.max(3, Math.abs(yo - yc))}" fill="${col}"/>`; });
    (d.d || []).forEach(([i,v]) => { g += `<circle class="ring" cx="${X(i)}" cy="${y(v)}" r="7"/>`; });
    (d.n || []).forEach(([i,v,tx,an]) => { g += `<text x="${X(i)}" y="${y(v) + 4}" text-anchor="${an}">${sw(tx, bias)}</text>`; });
  }
  return `<figure class="dg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${GLOSS[i][0]}, schematic">${g}</svg></figure>`;
}

