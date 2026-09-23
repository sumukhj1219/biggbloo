import React from "react";
import Container from "@/components/common/Container";

const Widgets = () => {
  return (
    <Container className="grid grid-cols-3 items-center justify-center w-full">
      <div className="w-40 h-40 p-2 bg-yellow-500 rounded-lg"></div>
      <div className="w-40 h-40 p-2 bg-yellow-500 rounded-lg"></div>
    </Container>
  );
};

export default Widgets;
