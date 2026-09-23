import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Container = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    )
  },
)
Container.displayName = 'Container'

export default Container
