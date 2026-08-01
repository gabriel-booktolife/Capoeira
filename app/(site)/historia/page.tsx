import type { Metadata } from "next";
import { CollectionPage } from "@/components/public/collection-page";
export const metadata: Metadata = { title: "História" };
export default function Page() { return <CollectionPage collection="stories" />; }
