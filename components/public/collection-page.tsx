import { getPublicItems } from "@/lib/content/repository";
import { sectionByCollection } from "@/lib/content/config";
import type { ContentCollection } from "@/lib/content/types";
import { ContentCard } from "./content-card";

export async function CollectionPage({ collection }: { collection: ContentCollection }) {
  const section = sectionByCollection[collection];
  const items = await getPublicItems(collection);
  return (
    <main>
      <section className="page-hero dark-section">
        <div className="container page-hero-inner">
          <p className="eyebrow">Chão Batido</p>
          <h1>{section.label}</h1>
          <p>{section.description}</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          {items.length ? (
            <div className={`content-grid ${collection === "team" ? "team-grid" : ""}`}>
              {items.map((item) => <ContentCard key={item.id} collection={collection} item={item} />)}
            </div>
          ) : (
            <div className="empty-public-state">
              <p className="eyebrow">Em preparação</p>
              <h2>Novos conteúdos chegarão em breve.</h2>
              <p>Estamos organizando esta parte da história do Chão Batido com o cuidado que ela merece.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
