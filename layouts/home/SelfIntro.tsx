import Container from "@/components/common/Container";
import React, { forwardRef } from "react";
import Image from "next/image";
import Heart from "@/icons/Heart";
import Link from "next/link";
import India from "@/icons/India";
import ThemeToggle from "@/components/common/ThemeToggle";

// Forwards to Container's own root now, not the paragraph specifically —
// child-rect measurement is recursive (see useChildRects), so it finds and
// decomposes the paragraph's words on its own once it walks this whole
// subtree; it doesn't need a ref planted directly on the <p> to do that.
const SelfIntro = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Container ref={ref} className="flex flex-col justify-center gap-y-3">
      <div className="flex items-center gap-x-3">
        <Image
          src={"/app/pfp.jpg"}
          className="size-10 sm:size-12 shrink-0 rounded-sm object-cover"
          width={48}
          height={48}
          alt="S"
        />
        <div className="flex min-w-0 flex-col justify-center">
          <span className="text-lg sm:text-xl">Sumukh</span>
          <span className="text-xs sm:text-sm text-muted-foreground/60 flex items-center gap-x-1">
            <Heart width={16} height={16} className="shrink-0" />
            <span>I love doing creative shit.</span>
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed sm:text-lg text-muted-foreground/60">
        22, based in India <India className="inline align-text-bottom mb-0.5" width={16} height={16} />. I build pixel-perfect UIs,{" "}
        <Link
          href={"https://x.com/biggbloo"}
          className="italic underline hover:text-primary"
        >
          games
        </Link>{" "}
        and backends, and
        sweat the small details. Find me on X as{" "}
        <Link
          href={"https://x.com/biggbloo"}
          className="italic underline hover:text-primary"
        >
          @biggbloo
        </Link>
        .
      </p>
    </Container>
  );
});
SelfIntro.displayName = "SelfIntro";

export default SelfIntro;
