"use client";
import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type ISeriesPrimitive, type SeriesAttachedParameter, type Time } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import { sw, type Bias } from "@/lib/checklist";
import { SMT_ES, SMT_NQ, build, termSpec, type Built } from "@/lib/chartData";
import { DIAG, type Spec } from "@/lib/diagram";

type Colors = Record<"field" | "ink" | "muted" | "rule" | "rule2" | "bull" | "bear" | "accent" | "onAccent", string>;

const readColors = (): Colors => {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string) => cs.getPropertyValue(n).trim();
  return { field: g("--field"), ink: g("--ink"), muted: g("--muted"), rule: g("--rule"), rule2: g("--rule-2"), bull: g("--bull"), bear: g("--bear"), accent: g("--accent"), onAccent: g("--on-accent") };
};

/** Draws the shaded zones, numbered markers and candle tags on top of the candles. */
class Overlay implements ISeriesPrimitive<Time> {
  private chart?: IChartApi;
  private series?: ISeriesApi<"Candlestick">;
  constructor(private b: Built, private c: Colors, private flip: boolean) {}
  attached(p: SeriesAttachedParameter<Time>) { this.chart = p.chart as IChartApi; this.series = p.series as ISeriesApi<"Candlestick">; }
  detached() { this.chart = undefined; this.series = undefined; }
  paneViews() {
    return [{
      zOrder: () => "top" as const,
      renderer: () => ({
        draw: (target: CanvasRenderingTarget2D) => target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr, bitmapSize }) => {
          const chart = this.chart, series = this.series;
          if (!chart || !series) return;
          const ts = chart.timeScale();
          // interpolate between whole bars so zone edges can sit between candles
          const X = (l: number) => {
            const i = Math.floor(l);
            const a = ts.logicalToCoordinate(i as never), b = ts.logicalToCoordinate((i + 1) as never);
            if (a == null || b == null) return null;
            return a + (l - i) * (b - a);
          };
          const Y = (p: number) => series.priceToCoordinate(p);
          ctx.font = `${600 * 1} ${11 * vr}px ui-monospace, Menlo, monospace`;
          ctx.textBaseline = "middle";

          this.b.zones.forEach((z) => {
            const x1 = X(z.l1), x2 = X(z.l2), y1 = Y(z.p1), y2 = Y(z.p2);
            if (x1 == null || x2 == null || y1 == null || y2 == null) return;
            ctx.fillStyle = this.c.accent + "59"; // ~35% alpha on a #rrggbb accent
            ctx.fillRect(x1 * hr, Math.min(y1, y2) * vr, (x2 - x1) * hr, Math.abs(y1 - y2) * vr);
            if (z.label) { ctx.fillStyle = this.c.ink; ctx.textAlign = "right"; ctx.fillText(z.label, (x2 - 6) * hr, ((y1 + y2) / 2) * vr); }
          });

          ctx.textAlign = "center";
          this.b.tags.forEach((t) => {
            const x = X(t.logical);
            if (x == null) return;
            ctx.fillStyle = this.c.muted;
            ctx.fillText(t.text, x * hr, (this.flip ? 12 : bitmapSize.height / vr - 12) * vr);
          });

          this.b.badges.forEach((bd) => {
            const x = X(bd.logical), y = Y(bd.price);
            if (x == null || y == null) return;
            const ox = bd.dir === "r" ? 20 : bd.dir === "l" ? -20 : 0;
            const oy = bd.dir === "u" ? -20 : bd.dir === "d" ? 20 : 0;
            ctx.beginPath();
            ctx.arc((x + ox) * hr, (y + oy) * vr, 10 * hr, 0, Math.PI * 2);
            ctx.fillStyle = this.c.accent; ctx.fill();
            ctx.lineWidth = 1.5 * hr; ctx.strokeStyle = this.c.ink; ctx.stroke();
            ctx.fillStyle = this.c.onAccent;
            ctx.font = `700 ${11 * vr}px ui-monospace, Menlo, monospace`;
            ctx.fillText(String(bd.n), (x + ox) * hr, (y + oy) * vr + 0.5 * vr);
          });
        }),
      }),
    }];
  }
}

function Chart({ spec, lead, seed, bias, height = 250, labels }: { spec: Spec; lead: "down" | "up" | "flat"; seed: number; bias: Bias; height?: number; labels?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(0);

  // rebuild when the app theme changes (manual toggle or system)
  useEffect(() => {
    const bump = () => setTheme((n) => n + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => { mo.disconnect(); mq.removeEventListener("change", bump); };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const c = readColors();
    const built = build(spec, lead, seed, bias);
    const chart = createChart(el, {
      autoSize: true,
      height,
      layout: { background: { color: c.field }, textColor: c.muted, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, attributionLogo: false },
      grid: { vertLines: { color: c.rule2 }, horzLines: { color: c.rule2 } },
      rightPriceScale: { borderColor: c.rule, scaleMargins: { top: 0.2, bottom: 0.3 } },
      timeScale: { visible: false, rightOffset: 2, fixLeftEdge: true },
      handleScroll: false,
      handleScale: false,
      crosshair: { vertLine: { color: c.muted, labelVisible: false }, horzLine: { color: c.muted, labelBackgroundColor: c.ink } },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: c.bull, borderUpColor: c.bull, wickUpColor: c.bull,
      downColor: c.bear, borderDownColor: c.bear, wickDownColor: c.bear,
      lastValueVisible: false, priceLineVisible: false,
    });
    series.setData(built.bars.map((b) => ({ ...b, time: b.time as never })));
    built.levels.forEach((l) => series.createPriceLine({ price: l.price, color: c.ink, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: sw(l.title, bias) }));
    series.attachPrimitive(new Overlay({ ...built, zones: built.zones.map((z) => ({ ...z, label: z.label ? sw(z.label, bias) : z.label })) }, c, bias === "bear"));
    chart.timeScale().fitContent();
    void labels;
    return () => chart.remove();
  }, [spec, lead, seed, bias, theme, height, labels]);

  return <div ref={box} className="tchart" style={{ height }} />;
}

export default function TermChart({ index, bias }: { index: number; bias: Bias }) {
  const d = DIAG[index];
  const steps = (
    <ol className="dg-steps">
      {d.steps.map((s, k) => <li key={k}><span className="bd">{k + 1}</span><span>{sw(s.text, bias)}</span></li>)}
    </ol>
  );
  if (d.smt) {
    return (
      <figure className="dg">
        <div className="tstack">
          <div><p className="tname">NQ</p><Chart spec={SMT_NQ} lead="down" seed={2201} bias={bias} height={190} /></div>
          <div><p className="tname">ES</p><Chart spec={SMT_ES} lead="down" seed={2201} bias={bias} height={190} /></div>
        </div>
        {steps}
        <figcaption className="sub">Illustrative generated prices, not a real market.</figcaption>
      </figure>
    );
  }
  const t = termSpec(index);
  return (
    <figure className="dg">
      <Chart spec={t.spec} lead={t.lead} seed={t.seed} bias={bias} />
      {steps}
      <figcaption className="sub">Illustrative generated prices, not a real market.</figcaption>
    </figure>
  );
}
