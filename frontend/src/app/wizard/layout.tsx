"use client";

import { WizardProvider } from "@/lib/wizardContext";

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WizardProvider>{children}</WizardProvider>;
}
