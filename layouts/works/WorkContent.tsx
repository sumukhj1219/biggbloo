import Container from '@/components/common/Container'
import WorkItems from './WorkItems'
import React, { forwardRef } from "react";
import { motion } from "motion/react";
import HoverChecker from '@/components/ui/HoverChecker'


const WorkContent = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container className='w-full flex flex-col justify-center gap-y-8 sm:gap-y-10' ref={ref}>
      <motion.span
        initial="rest"
        animate="rest"
        whileHover="hover"
        className='relative isolate flex w-fit items-stretch sm:text-lg text-sm'
      >
        <span
          aria-hidden="true"
          className='absolute inset-0 -z-10 bg-sky-300 shadow-[inset_0_0_12px_0px_var(--color-background)]'
        />
        <HoverChecker fill='text-sky-300' className='w-[1.125rem] sm:w-6' />
        <span className='px-2 py-1'>Works</span>
      </motion.span>
      <WorkItems />
    </Container>
  )
});
WorkContent.displayName = "WorkContent";

export default WorkContent
