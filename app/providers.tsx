"use client";

import { SessionProvider } from "next-auth/react";
import StyledComponentsRegistry from "@/lib/StyledComponentsRegistry";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <SessionProvider>{children}</SessionProvider>
    </StyledComponentsRegistry>
  );
}
