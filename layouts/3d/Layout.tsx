"use client";

import React, { Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return createPortal(
    <div className="fixed inset-0 z-50 h-dvh w-screen">
      <Canvas>
        {/* `color` isn't a real Canvas prop — R3F silently ignores unknown
            ones. The scene's background is set by adding a <color> element
            attached to it, not a prop on Canvas itself. */}
        <color attach="background" args={["blue"]} />
        {/* useGLTF (WireframeModel, etc.) suspends while a .glb loads —
            without this boundary, that would error instead of just waiting. */}
        <Suspense fallback={null}>{children}</Suspense>
        <OrbitControls minAzimuthAngle={-0.09} maxAzimuthAngle={0.09}  minPolarAngle={Math.PI / 2 - 0.25} maxPolarAngle={Math.PI / 2 + 0.25}  />
      </Canvas>
    </div>,
    document.body,
  );
};

export default Layout;
