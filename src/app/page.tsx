import type React from "react";

import { ArgusApp } from "@/components/ArgusApp";

type HomeProps = Record<string, never>;

const Home: React.FC<HomeProps> = () => {
  return <ArgusApp />;
};

export default Home;
