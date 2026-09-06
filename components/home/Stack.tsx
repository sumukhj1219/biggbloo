"use client";

import React from 'react'

const STACK_ICONS = [
  { src: "/stack/anthropic-1.png", alt: "Anthropic" },
  { src: "/stack/nextjs-13.png", alt: "Next.js" },
  { src: "/stack/typescript.png", alt: "TypeScript" },
  { src: "/stack/tailwind-css-2.svg", alt: "Tailwind CSS" },
  { src: "/stack/nodejs-icon.png", alt: "Node.js" },
  { src: "/stack/golang-1.png", alt: "Go" },
  { src: "/stack/python-5.png", alt: "Python" },
  { src: "/stack/postgresql-inc-2.png", alt: "PostgreSQL" },
  { src: "/stack/docker-4.png", alt: "Docker" },
  { src: "/stack/github-icon-1.png", alt: "GitHub" },
  { src: "/stack/figma-icon.png", alt: "Figma" },
  { src: "/stack/ubuntu-4.png", alt: "Ubuntu" },
  { src: "/stack/redis.png", alt: "Redis" },
  { src: "/stack/threejs-1.png", alt: "Three.js" },
  { src: "/stack/vitejs.png", alt: "Vite" },
];

const Stack = () => {
  return (
    <div
      className="flex flex-col items-center aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:w-64 sm:h-48"
    >
      <div className='flex items-center gap-1 sm:gap-2'>
        <span className="text-secondary text-[14px] sm:text-base">my daily</span>
        <span className="text-black bg-white rounded-full px-2 py-0 text-[12px] sm:text-sm">tool stack</span>
      </div>
      <div className="grid grid-cols-5 content-start gap-x-1 gap-y-1 sm:gap-x-1.5 sm:gap-y-1.5 w-full sm:w-10/12 h-full mt-1">
        {STACK_ICONS.map(({ src, alt }) => (
          <div
            key={src}
            className="flex items-center justify-center bg-linear-to-b from-white via-neutral-200 to-neutral-300 border inset-shadow-xs inset-shadow-white rounded-lg p-1 aspect-square shadow-sm"
          >
            <img className="w-3/4 h-3/4 object-contain" src={src} alt={alt} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Stack
