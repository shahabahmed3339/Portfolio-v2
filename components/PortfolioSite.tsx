"use client";

import { Footer } from "@/src/components/Footer/Footer";
import { Header } from "@/src/components/Header/Header";
import { Main } from "@/src/components/Main/Main";
import { GlobalStyle } from "@/src/styles/global";

/**
 * Client shell for the public site. The Header/Main already include the
 * styled-components <GlobalStyle> via the root, so we render it here.
 */
export function PortfolioSite({ data }: { data: any }) {
  return (
    <>
      <GlobalStyle />
      <Header data={data} />
      <Main data={data} />
      <Footer links={data.head.links} />
    </>
  );
}
