import Container from '@/components/common/Container'
import WorkItems from './WorkItems'
import { forwardRef } from "react";
import SectionTitle from '@/components/common/SectionTitle'

const WorkContent = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container className='w-full flex flex-col justify-center gap-y-4 sm:gap-y-6' ref={ref}>
      <SectionTitle>Works</SectionTitle>
      <WorkItems />
    </Container>
  )
});
WorkContent.displayName = "WorkContent";

export default WorkContent
