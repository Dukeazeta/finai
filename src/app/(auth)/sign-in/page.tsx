import type { Metadata } from "next";
import { Suspense } from "react";
import { isGoogleConfigured } from "@/lib/features";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return (
    <Suspense>
      <SignInForm google={isGoogleConfigured} />
    </Suspense>
  );
}
