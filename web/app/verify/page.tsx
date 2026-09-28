export const dynamic = "force-dynamic";

import { Suspense } from "react";
import VerifyContent from "./VerifyContent";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
