import Container from "@/components/common/Container";
import { forwardRef } from "react";
import Image from "next/image";
import Heart from "@/icons/Heart";
import India from "@/icons/India";
import PixelXCard from "@/components/ui/PixelXCard";
import AvatarInspector from "@/components/ui/AvatarInspector";

const SelfIntro = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container ref={ref} className="flex flex-col justify-center gap-y-3">
      {/* Bottom room for the avatar inspector's width label. */}
      <div className="mb-3 flex items-center gap-x-3">
        <AvatarInspector className="size-10 sm:size-12">
          <Image src={"/app/pfp.jpg"} className="size-full object-cover" width={48} height={48} alt="S" />
        </AvatarInspector>
        <div className="flex min-w-0 flex-col justify-center">
          <span className="text-lg sm:text-xl">Sumukh</span>
          <span className="text-xs sm:text-sm text-muted-foreground/60 flex items-center gap-x-1">
            <Heart width={16} height={16} className="shrink-0" />
            <span>I love doing creative shit.</span>
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed sm:text-lg text-muted-foreground/60">
        22, based in India <India className="inline align-text-bottom mb-0.5" width={16} height={16} />. I build <span className="text-foreground">pixel-perfect UIs</span>,{" "}
        <span className="text-foreground">games</span>{" "}
        and <span className="text-foreground">backends</span>, and
        sweat the <span className="text-foreground">small details</span>. Find me on X as{" "}
        <PixelXCard href={"https://x.com/biggbloo"}>@biggbloo</PixelXCard>
        .
      </p>
    </Container>
  );
});
SelfIntro.displayName = "SelfIntro";

export default SelfIntro;
