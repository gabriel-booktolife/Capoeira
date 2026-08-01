import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/content/repository";

export default async function SettingsPage() { await requireAdmin(); return <SettingsForm initial={await getSiteSettings()} />; }
