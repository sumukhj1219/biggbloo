import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
      domains: [
        "x.com", // Microlink Image Preview
      ],
  },
  allowedDevOrigins: ['ee46-2401-4900-c974-1112-b0f6-b7e1-8d72-295d.ngrok-free.app'],
};

export default nextConfig;
