"use client";

import React from 'react'
import { useFluidScale } from '@/hooks/useFluidScale'


const Stack = () => {
  const scale = useFluidScale(390, 576, 1, 1.5);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top right",
        marginBottom: 140 * (scale - 1),
      }}
      className='h-[140px] w-[140px] sm:w-64 sm:h-48 sm:flex sm:flex-col sm:items-center'
    >
      <div className='flex items-center gap-2'>
        <span className="text-secondary">my daily</span>
        <span className="text-primary">tool stack</span>
      </div>
      <img className='w-full sm:w-10/12 h-full' src="/app/stack.png" alt="tool stack" />
    </div>
  )
}

export default Stack
