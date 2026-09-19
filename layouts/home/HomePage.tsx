import Container from "@/components/common/Container";
import React from "react";
import SelfIntro from "./SelfIntro";
import Work from "./Work";

const HomePage = () => {
  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
      <SelfIntro />
      <Work />
    </Container>
  );
};

export default HomePage;
