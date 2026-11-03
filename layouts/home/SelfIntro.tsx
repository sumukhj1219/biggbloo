import Container from "@/components/common/Container";
import { forwardRef } from "react";
import Image from "next/image";
import Heart from "@/icons/Heart";
import India from "@/icons/India";
import PixelXCard from "@/components/ui/PixelXCard";
import AvatarInspector from "@/components/ui/AvatarInspector";
import Reveal from "@/components/common/Reveal";

const SelfIntro = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container ref={ref} className="flex flex-col justify-center gap-y-3">
      {/* Bottom room for the avatar inspector's width label. */}
      <div className="mb-3 flex items-center gap-x-3">
        {/* The avatar and its inspector open the page; everything else waits. */}
        <Reveal first className="shrink-0">
          <AvatarInspector className="size-10 sm:size-12" introDelay={0.35}>
            <Image src={"/app/pfp.jpg"} className="size-full object-cover" width={48} height={48} alt="S" priority />
          </AvatarInspector>
        </Reveal>
        <Reveal index={1} className="flex min-w-0 flex-col justify-center">
          <span className="text-base sm:text-lg">Sumukh</span>
          <span className="text-xs sm:text-sm text-muted-foreground/60 flex items-center gap-x-1">
            <Heart width={16} height={16} className="shrink-0" />
            <span>I love doing creative shit.</span>
          </span>
        </Reveal>
      </div>

      <Reveal index={2}>
        <p className="text-sm leading-relaxed sm:text-base text-muted-foreground/60">
          22, based in India <India className="inline align-text-bottom mb-0.5" width={16} height={16} />. I build <span className="text-foreground">pixel-perfect UIs</span>,{" "}
          <span className="text-foreground">games</span>{" "}
          and <span className="text-foreground">backends</span>, and
          sweat the <span className="text-foreground">small details</span>. Find me on X as{" "}
          <PixelXCard href={"https://x.com/biggbloo"}>@biggbloo</PixelXCard>
          .
        </p>
      </Reveal>
    </Container>
  );
});
SelfIntro.displayName = "SelfIntro";

export default SelfIntro;
