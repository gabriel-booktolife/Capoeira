import { notFound } from "next/navigation";
import { AdminCrud } from "@/components/admin/admin-crud";
import { requireAdmin } from "@/lib/auth/session";
import { isContentCollection, sectionByCollection } from "@/lib/content/config";
import { getAdminItems, getLocationOptions, getTeamOptions } from "@/lib/content/repository";

export default async function AdminCollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  await requireAdmin();
  const { collection } = await params;
  if (!isContentCollection(collection)) notFound();
  const [items, teamOptions, locationOptions] = await Promise.all([getAdminItems(collection), getTeamOptions(), getLocationOptions()]);
  return <AdminCrud config={sectionByCollection[collection]} initialItems={items} teamOptions={teamOptions} locationOptions={locationOptions} />;
}
