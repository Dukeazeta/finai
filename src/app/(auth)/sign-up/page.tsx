import type { Metadata } from "next";
import { Suspense } from "react";
import { isGoogleConfigured } from "@/lib/features";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default function Page() {
  return (
    <Suspense>
      <SignUpForm google={isGoogleConfigured} />
    </Suspense>
  );
}
