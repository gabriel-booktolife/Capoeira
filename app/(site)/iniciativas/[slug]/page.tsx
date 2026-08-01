import { ContentDetail } from "@/components/public/content-detail";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <ContentDetail collection="initiatives" slug={(await params).slug} />; }
