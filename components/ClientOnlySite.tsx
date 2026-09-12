"use client";

import dynamic from "next/dynamic";

// The portfolio uses legacy client-only libraries (react-tsparticles,
// react-router-hash-link, styled-components GlobalStyle). Rendering it
// client-side avoids SSR context conflicts while keeping a single port.
const PortfolioSite = dynamic(
  () => import("@/components/PortfolioSite").then((mod) => mod.PortfolioSite),
  { ssr: false, loading: () => <div style={{ minHeight: "100vh", background: "#212121" }} /> },
);

export function ClientOnlySite({ data }: { data: any }) {
  return <PortfolioSite data={data} />;
}
