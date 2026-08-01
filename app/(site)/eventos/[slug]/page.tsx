import { ContentDetail } from "@/components/public/content-detail";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <ContentDetail collection="events" slug={(await params).slug} />; }
