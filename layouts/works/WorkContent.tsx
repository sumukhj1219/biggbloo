import Container from '@/components/common/Container'
import WorkItems from './WorkItems'
import React, { forwardRef } from "react";

const WorkContent = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container className='w-full flex flex-col justify-center gap-y-8 sm:gap-y-10' ref={ref}>
      <span className='sm:text-lg text-sm'>Works</span>
      <WorkItems />
    </Container>
  )
});
WorkContent.displayName = "WorkContent";

export default WorkContent
