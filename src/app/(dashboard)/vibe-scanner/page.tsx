import { redirect } from "next/navigation";

/**
 * Legacy Vibe Scanner page -- redirects to the new multi-scanner architecture.
 * The old single-scanner UI has been replaced by /scanners (Plan 02-06).
 */
export default function VibeScannerPage() {
  redirect("/scanners");
}
