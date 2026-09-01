import { EventRegistrationForm } from "@/components/admin/event-registration-form";
import { requireAdmin } from "@/lib/auth/session";

export default async function NewEventPage() {
  await requireAdmin();
  return <EventRegistrationForm />;
}
