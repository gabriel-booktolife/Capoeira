import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getSiteSettings } from "@/lib/content/repository";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="public-site">
      <SiteHeader groupName={settings.groupName} />
      {children}
      <SiteFooter settings={settings} />
    </div>
  );
}
