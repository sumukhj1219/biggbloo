export interface MoodboardItem {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  caption?: string;
  ratio: number;
}

export const moodboardItems: MoodboardItem[] = [
  { id: "1", type: "video", src: "/app/claudesprites.mp4", alt: "claudesprites demo", ratio: 1.778 },
  { id: "2", type: "video", src: "/app/video.mp4", alt: "liquid glass demo", ratio: 1 },

  { id: "3", type: "video", src: "/moodboard/summerjam-homescreen.mp4", alt: "summerjam home screen", ratio: 1.733 },
  { id: "4", type: "video", src: "/moodboard/sprite-dino.mp4", alt: "sprite dino", ratio: 1.521 },
  { id: "5", type: "video", src: "/moodboard/onepiece-grass.mp4", alt: "one piece three.js grass experiment", ratio: 1.959 },
  { id: "6", type: "video", src: "/moodboard/threejs-mockup.mp4", alt: "three.js mockup", ratio: 2.065 },
  { id: "7", type: "video", src: "/moodboard/explosion-debris.mp4", alt: "explosion debris", ratio: 2.056 },
  { id: "8", type: "video", src: "/moodboard/race-track-car.mp4", alt: "race track car", ratio: 1.778 },
  { id: "9", type: "video", src: "/moodboard/vibejam-progress.mp4", alt: "vibejam progress", ratio: 1.778 },
  { id: "10", type: "video", src: "/moodboard/vibejam-progress2.mp4", alt: "vibejam progress 2", ratio: 2.065 },
  { id: "11", type: "video", src: "/moodboard/threejs-visuals.mp4", alt: "three.js visuals", ratio: 2.082 },
  { id: "12", type: "video", src: "/moodboard/metallic-shade.mp4", alt: "metallic shade", ratio: 1.239 },
  { id: "13", type: "video", src: "/moodboard/infinite-castle.mp4", alt: "infinite castle, demon slayer", ratio: 1.778 },
  { id: "14", type: "video", src: "/moodboard/math-colors.mp4", alt: "math and colors experiment", ratio: 1.901 },
  { id: "15", type: "video", src: "/moodboard/model-interactions.mp4", alt: "model interactions", ratio: 1.778 },
  { id: "16", type: "video", src: "/moodboard/particle-system.mp4", alt: "particle system", ratio: 1.008 },
  { id: "17", type: "video", src: "/moodboard/new-animation.mp4", alt: "new animation", ratio: 2.162 },
  { id: "18", type: "video", src: "/moodboard/portfolio-animation.mp4", alt: "portfolio animation", ratio: 2.196 },
];
