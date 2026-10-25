"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import type { XProfile } from "@/lib/x";

const COLS = 32;
const ROWS = 26;
const CELLS = COLS * ROWS;
const hash = (n: number) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
};
const ORDER = new Array<number>(CELLS);
Array.from({ length: CELLS }, (_, i) => i)
  .sort((a, b) => hash(a) - hash(b))
  .forEach((cell, rank) => (ORDER[cell] = rank));
const REVEAL_MS = 600;
const COVER_MS = 360;
const NOISE = [
  "#1e40af",
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#93c5fd",
  "#dbeafe",
  "#e5e7eb",
];
const NOISE_FPS = 14;
const LOADING_HEIGHT = 262;

let profilePromise: Promise<XProfile | null> | null = null;
const loadProfile = () =>
  (profilePromise ??= fetch("/api/x-profile")
    .then((res) => (res.ok ? (res.json() as Promise<XProfile>) : null))
    .catch(() => null));

const count = new Intl.NumberFormat("en");

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string) => {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
};

const PIXEL_LEVELS = [8, 16, 32, 64, 128, 0];

const PixelatedBanner = ({
  img,
  delay,
  sharp,
}: {
  img: HTMLImageElement;
  delay: number;
  sharp: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const { width: w, height: h } = canvas;
    const small = document.createElement("canvas");
    const sctx = small.getContext("2d");

    const draw = (cols: number) => {
      if (!cols || !sctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, w, h);
        return;
      }
      small.width = cols;
      small.height = Math.max(1, Math.round((cols * h) / w));
      sctx.drawImage(img, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, w, h);
    };

    if (sharp) return draw(0);
    draw(PIXEL_LEVELS[0]);
    const timers = PIXEL_LEVELS.slice(1).map((cols, i) =>
      window.setTimeout(() => draw(cols), (delay + (i + 1) * 0.09) * 1000),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [img, delay, sharp]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
};

type CurtainMode = "loading" | "reveal" | "cover";

const PixelCurtain = ({
  mode,
  onCovered,
}: {
  mode: CurtainMode;
  onCovered: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cells = useRef<Uint8Array>(new Uint8Array(CELLS).fill(1));
  const colors = useRef<string[]>(
    Array.from({ length: CELLS }, (_, i) => NOISE[hash(i) % NOISE.length]),
  );
  const onCoveredRef = useRef(onCovered);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    onCoveredRef.current = onCovered;
  }, [onCovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const page = getComputedStyle(document.body).backgroundColor;
    const start = performance.now();
    const duration = reduceMotion ? 0 : mode === "cover" ? COVER_MS : REVEAL_MS;
    let lastNoise = 0;
    let frame = 0;

    const tick = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const elapsed = now - start;
      const progress = duration ? elapsed / duration : 1;
      let pending = 0;
      for (let i = 0; i < CELLS; i++) {
        const due = ORDER[i] / CELLS <= progress;
        if (mode === "reveal" && cells.current[i] !== 0) {
          if (due) cells.current[i] = 0;
          else pending++;
        } else if (mode === "cover" && cells.current[i] !== 2) {
          if (due) cells.current[i] = 2;
          else pending++;
        }
      }

      if (!reduceMotion && now - lastNoise > 1000 / NOISE_FPS) {
        lastNoise = now;
        for (let i = 0; i < CELLS; i++) {
          if (Math.random() < 0.3)
            colors.current[i] = NOISE[(Math.random() * NOISE.length) | 0];
        }
      }

      ctx.clearRect(0, 0, w, h);
      const cw = w / COLS;
      const ch = h / ROWS;
      for (let i = 0; i < CELLS; i++) {
        const state = cells.current[i];
        if (!state) continue;
        ctx.fillStyle = state === 2 ? page : colors.current[i];
        const x = i % COLS;
        const y = (i / COLS) | 0;
        const x0 = Math.floor(x * cw);
        const y0 = Math.floor(y * ch);
        ctx.fillRect(
          x0,
          y0,
          Math.ceil((x + 1) * cw) - x0,
          Math.ceil((y + 1) * ch) - y0,
        );
      }

      if (mode === "cover" && !pending) return onCoveredRef.current();
      if (mode === "reveal" && !pending) return;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};

type Loaded = { profile: XProfile; banner: HTMLImageElement };

let readyPromise: Promise<Loaded | null> | null = null;
const loadAll = () =>
  (readyPromise ??= loadProfile()
    .then(async (profile) => {
      if (!profile?.bannerUrl) return null;
      const [banner] = await Promise.all([
        loadImage(profile.bannerUrl),
        profile.avatarUrl
          ? loadImage(profile.avatarUrl).catch(() => null)
          : null,
      ]);
      return { profile, banner };
    })
    .catch(() => null));

const PixelXCard = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  const settle = (result: Loaded | null) => (result ? setLoaded(result) : setFailed(true));

  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => loadAll().then(settle));
  }, []);

  const show = () => {
    if (failed) return;
    window.clearTimeout(timer.current);
    setLeaving(false);
    loadAll().then(settle);
    timer.current = window.setTimeout(() => setMounted(true), 120);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLeaving(true), 180);
  };
  const unmount = () => {
    setMounted(false);
    setLeaving(false);
  };

  const mode: CurtainMode = leaving || failed ? "cover" : loaded ? "reveal" : "loading";

  return (
    <span
      className="relative inline-block"
      onPointerEnter={show}
      onPointerLeave={hide}
    >
      <Link href={href} className="italic underline hover:text-primary">
        {children}
      </Link>

      {mounted && (
        <span className="absolute top-full -left-8 z-45 block pt-3 not-italic">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="relative isolate block w-80 overflow-hidden border-2 bg-background text-left text-foreground inset-shadow-xs"
          >
            {loaded ? (
              <>
                <span className="block aspect-[3/1]">
                  <PixelatedBanner
                    img={loaded.banner}
                    delay={REVEAL_MS / 2000}
                    sharp={!!reduceMotion}
                  />
                </span>

                <span className="block px-4 pb-4">
                  {loaded.profile.avatarUrl && (
                    <Image
                      src={loaded.profile.avatarUrl}
                      width={64}
                      height={64}
                      alt=""
                      unoptimized
                      loading="eager"
                      crossOrigin="anonymous"
                      className="relative -mt-8 size-16 rounded-full border-4 border-background object-cover"
                    />
                  )}

                  <span className="mt-2 flex items-center gap-x-1 text-base font-bold leading-tight">
                    {loaded.profile.name}
                    {loaded.profile.verified && (
                      <svg
                        viewBox="0 0 22 22"
                        className="size-4.5"
                        aria-label="Verified"
                      >
                        <path
                          className="fill-sky-500"
                          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"
                        />
                        <path
                          className="fill-white"
                          d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground/60">
                    @{loaded.profile.handle}
                  </span>

                  {loaded.profile.bio && (
                    <span className="mt-2 block text-sm text-sky-600">
                      {loaded.profile.bio}
                    </span>
                  )}

                  <span className="mt-3 flex gap-x-4 text-sm text-muted-foreground/60">
                    <span>
                      <span className="font-bold text-foreground">
                        {count.format(loaded.profile.following)}
                      </span>{" "}
                      Following
                    </span>
                    <span>
                      <span className="font-bold text-foreground">
                        {count.format(loaded.profile.followers)}
                      </span>{" "}
                      Followers
                    </span>
                  </span>
                </span>
              </>
            ) : (
              <span className="block" style={{ height: LOADING_HEIGHT }} />
            )}

            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_0px_var(--color-background)]"
            />

            <PixelCurtain mode={mode} onCovered={unmount} />
          </a>
        </span>
      )}
    </span>
  );
};

export default PixelXCard;
