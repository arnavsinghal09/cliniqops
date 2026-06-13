import { requireRole } from "@/lib/authz";
import UploadForm from "@/components/upload/UploadForm";

// ADMIN-only. requireRole redirects a doctor to /dashboard before any render.
export default async function UploadPage() {
  await requireRole(["ADMIN"]);
  return <UploadForm />;
}
