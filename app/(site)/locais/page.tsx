import type { Metadata } from "next";
import { CollectionPage } from "@/components/public/collection-page";
export const metadata: Metadata = { title: "Locais" };
export default function Page() { return <CollectionPage collection="locations" />; }
