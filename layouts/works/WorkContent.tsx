import Container from '@/components/common/Container'
import WorkItems from './WorkItems'
import { forwardRef } from "react";
import SectionTitle from '@/components/common/SectionTitle'

const WorkContent = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container className='w-full flex flex-col justify-center gap-y-8 sm:gap-y-10' ref={ref}>
      <SectionTitle bg='bg-sky-300' fill='text-sky-300'>Works</SectionTitle>
      <WorkItems />
    </Container>
  )
});
WorkContent.displayName = "WorkContent";

export default WorkContent
