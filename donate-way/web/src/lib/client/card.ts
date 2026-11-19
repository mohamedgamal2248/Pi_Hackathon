// Draws a shareable "impact card" on a canvas (4:5) and returns a PNG blob. Runs fully in the browser.
export type CardSpec = {
  kicker: string; // small line on top
  big: string; // main number / sentence
  sub?: string; // line under it
  rows?: string[]; // up to 3 detail lines
  footer: string;
  url: string; // short display text of the link
  rtl: boolean;
};

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function drawCard(spec: CardSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (px: number, weight = 700) => `${weight} ${px}px ui-sans-serif, system-ui, "Segoe UI", Tahoma, Arial, sans-serif`;
  ctx.direction = spec.rtl ? "rtl" : "ltr";
  ctx.textAlign = "center";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1b1e");
  bg.addColorStop(1, "#13292d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 100, 120, 0, W - 100, 120, 600);
  glow.addColorStop(0, "rgba(198,244,50,0.28)");
  glow.addColorStop(1, "rgba(198,244,50,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#c6f432";
  ctx.font = font(96, 800);
  ctx.fillText("سند.", W / 2, 170);

  ctx.fillStyle = "#9fb4b8";
  ctx.font = font(44, 600);
  ctx.fillText(spec.kicker, W / 2, 330);

  ctx.fillStyle = "#c6f432";
  let size = 150;
  ctx.font = font(size, 800);
  while (ctx.measureText(spec.big).width > W - 140 && size > 56) {
    size -= 6;
    ctx.font = font(size, 800);
  }
  ctx.fillText(spec.big, W / 2, 560);

  let y = 680;
  if (spec.sub) {
    ctx.fillStyle = "#e8f1f2";
    ctx.font = font(54, 700);
    for (const line of wrap(ctx, spec.sub, W - 200).slice(0, 3)) {
      ctx.fillText(line, W / 2, y);
      y += 74;
    }
  }
  y += 30;
  ctx.font = font(42, 600);
  ctx.fillStyle = "#9fb4b8";
  for (const r of (spec.rows ?? []).slice(0, 3)) {
    ctx.fillText(r, W / 2, y);
    y += 66;
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(80, H - 250, W - 160, 2);
  ctx.fillStyle = "#e8f1f2";
  ctx.font = font(44, 700);
  ctx.fillText(spec.footer, W / 2, H - 170);
  ctx.fillStyle = "#c6f432";
  ctx.font = font(38, 600);
  ctx.direction = "ltr";
  ctx.fillText(spec.url, W / 2, H - 100);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}
