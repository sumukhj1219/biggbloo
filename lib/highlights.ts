export const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#fde68a" },
  { name: "green", value: "#bbf7d0" },
  { name: "pink", value: "#fbcfe8" },
  { name: "blue", value: "#bae6fd" },
  { name: "violet", value: "#ddd6fe" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["name"];

export interface Highlight {
  id: string;
  color: HighlightColor;
  text: string;
  prefix: string;
  suffix: string;
}

const CONTEXT = 32;
const colorValue = (color: HighlightColor) =>
  HIGHLIGHT_COLORS.find((c) => c.name === color)!.value;
const ROOT = "[data-highlightable]";
const key = () => `highlights:${window.location.pathname}`;

export const loadHighlights = (): Highlight[] => {
  try {
    const raw = window.localStorage.getItem(key());
    return raw ? (JSON.parse(raw) as Highlight[]) : [];
  } catch {
    return [];
  }
};

const saveHighlights = (list: Highlight[]) => {
  try {
    if (list.length) window.localStorage.setItem(key(), JSON.stringify(list));
    else window.localStorage.removeItem(key());
  } catch {
  }
};

export const highlightRoot = (node: Node | null) =>
  (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>(
    ROOT,
  ) ?? null;

const textIndex = (root: HTMLElement) => {
  const nodes: { node: Text; start: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    nodes.push({ node: n as Text, start: text.length });
    text += n.textContent ?? "";
  }
  return { nodes, text };
};

const offsetOf = (root: HTMLElement, container: Node, offset: number) => {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
};

const rangeFor = (root: HTMLElement, start: number, end: number) => {
  const { nodes } = textIndex(root);
  const at = (pos: number, isEnd: boolean) => {
    const hit = nodes.find(({ node, start: s }) => {
      const len = node.textContent?.length ?? 0;
      return isEnd ? pos > s && pos <= s + len : pos >= s && pos < s + len;
    });
    return hit ? { node: hit.node, offset: pos - hit.start } : null;
  };
  const a = at(start, false);
  const b = at(end, true);
  if (!a || !b) return null;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
};

const wrap = (range: Range, h: Pick<Highlight, "id" | "color">) => {
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    root.nodeType === Node.TEXT_NODE ? root.parentNode! : root,
    NodeFilter.SHOW_TEXT,
  );
  const targets: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (range.intersectsNode(n) && n.textContent?.trim())
      targets.push(n as Text);
  }
  for (let node of targets) {
    if (node === range.endContainer) node.splitText(range.endOffset);
    if (node === range.startContainer && range.startOffset > 0)
      node = node.splitText(range.startOffset);
    const mark = document.createElement("mark");
    mark.dataset.hl = h.id;
    mark.dataset.color = h.color;
    mark.style.backgroundColor = colorValue(h.color);
    node.parentNode!.insertBefore(mark, node);
    mark.appendChild(node);
  }
};

const unwrap = (id: string) => {
  document
    .querySelectorAll<HTMLElement>(`mark[data-hl="${id}"]`)
    .forEach((mark) => {
      const parent = mark.parentNode!;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
};

const locate = (root: HTMLElement, h: Highlight) => {
  const { text } = textIndex(root);
  let best = -1;
  let bestScore = -1;
  for (
    let i = text.indexOf(h.text);
    i !== -1;
    i = text.indexOf(h.text, i + 1)
  ) {
    const before = text.slice(Math.max(0, i - CONTEXT), i);
    const after = text.slice(i + h.text.length, i + h.text.length + CONTEXT);
    const score =
      (before.endsWith(h.prefix) ? 2 : 0) +
      (after.startsWith(h.suffix) ? 2 : 0);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best === -1 ? null : rangeFor(root, best, best + h.text.length);
};

export const restoreHighlights = () => {
  const root = document.querySelector<HTMLElement>(ROOT);
  if (!root) return;
  for (const h of loadHighlights()) {
    if (root.querySelector(`mark[data-hl="${h.id}"]`)) continue;
    const range = locate(root, h);
    if (range) wrap(range, h);
  }
};

export const addHighlight = (range: Range, color: HighlightColor) => {
  const root = highlightRoot(range.commonAncestorContainer);
  const text = range.toString();
  if (!root || !text.trim()) return;
  const full = textIndex(root).text;
  const start = offsetOf(root, range.startContainer, range.startOffset);
  const end = start + text.length;
  const h: Highlight = {
    id: crypto.randomUUID(),
    color,
    text,
    prefix: full.slice(Math.max(0, start - CONTEXT), start),
    suffix: full.slice(end, end + CONTEXT),
  };
  wrap(range, h);
  saveHighlights([...loadHighlights(), h]);
};

export const recolorHighlight = (id: string, color: HighlightColor) => {
  document
    .querySelectorAll<HTMLElement>(`mark[data-hl="${id}"]`)
    .forEach((m) => {
      m.dataset.color = color;
      m.style.backgroundColor = colorValue(color);
    });
  saveHighlights(
    loadHighlights().map((h) => (h.id === id ? { ...h, color } : h)),
  );
};

export const removeHighlight = (id: string) => {
  unwrap(id);
  saveHighlights(loadHighlights().filter((h) => h.id !== id));
};
