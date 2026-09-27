"use client";

import React, { Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion } from "motion/react";
import { FADE_DURATION_S } from "@/store/useLayoutStore";

interface LayoutProps {
  children: React.ReactNode;
  fading: boolean;
}

const Layout = ({ children, fading }: LayoutProps) => {
  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 h-dvh w-screen"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: FADE_DURATION_S }}
    >
      <Canvas>
        <color attach="background" args={["blue"]} />
        <Suspense fallback={null}>{children}</Suspense>
        <OrbitControls minAzimuthAngle={-0.09} maxAzimuthAngle={0.09}  minPolarAngle={Math.PI / 2 - 0.25} maxPolarAngle={Math.PI / 2 + 0.25} enableZoom={false} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          maskImage:
            "radial-gradient(ellipse at center, transparent 50%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, transparent 50%, black 100%)",
        }}
      />
    </motion.div>,
    document.body,
  );
};

export default Layout;
