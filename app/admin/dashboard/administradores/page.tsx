import { AdminsManager } from "@/components/admin/admins-manager";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getAdminRecords } from "@/lib/content/repository";

export default async function AdministratorsPage() { const session = await requireSuperAdmin(); return <AdminsManager initial={await getAdminRecords()} currentUid={session.uid} />; }
