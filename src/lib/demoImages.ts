type Draw = (ctx: CanvasRenderingContext2D, size: number, color: string) => void;

function blobFrom(draw: Draw, color: string): Promise<Blob> {
  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Could not draw a picture."));
  draw(ctx, size, color);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not save a picture."));
    }, "image/png");
  });
}

function person(ctx: CanvasRenderingContext2D, size: number, color: string, shift = 0): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size * (0.5 + shift), size * 0.34, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * (0.5 + shift), size * 0.72, size * 0.26, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

const drawers: Record<string, Draw> = {
  people(ctx, size, color) {
    person(ctx, size, color, -0.12);
    person(ctx, size, color, 0.12);
  },
  person(ctx, size, color) {
    person(ctx, size, color, 0);
  },
  friend(ctx, size, color) {
    person(ctx, size, color, 0);
    ctx.fillStyle = color;
    ctx.fillRect(size * 0.36, size * 0.5, size * 0.28, size * 0.06);
  },
  everyday(ctx, size, color) {
    cup(ctx, size, color);
  },
  drink(ctx, size, color) {
    cup(ctx, size, color);
  },
  more(ctx, size, color) {
    bowl(ctx, size, color);
  },
  eat(ctx, size, color) {
    bowl(ctx, size, color);
  },
  also(ctx, size, color) {
    ball(ctx, size, color);
  },
  toy(ctx, size, color) {
    ball(ctx, size, color);
  },
  help(ctx, size, color) {
    hand(ctx, size, color);
  },
};

function cup(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.28);
  ctx.lineTo(size * 0.7, size * 0.28);
  ctx.lineTo(size * 0.62, size * 0.72);
  ctx.lineTo(size * 0.38, size * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.28, size * 0.2, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.045;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(size * 0.7, size * 0.46, size * 0.11, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
}

function bowl(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.58, size * 0.28, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.46, size * 0.28, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

function ball(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.16, 0.4, Math.PI - 0.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function hand(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const fingers = [0.34, 0.44, 0.54, 0.64];
  for (const x of fingers) {
    roundRect(ctx, size * x, size * 0.18, size * 0.08, size * 0.34, size * 0.04);
    ctx.fill();
  }
  roundRect(ctx, size * 0.3, size * 0.4, size * 0.4, size * 0.28, size * 0.08);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function drawDemo(kind: string, color: string): Promise<Blob> {
  const draw = drawers[kind] ?? drawers.person;
  if (!draw) return Promise.reject(new Error("Missing picture."));
  return blobFrom(draw, color);
}
