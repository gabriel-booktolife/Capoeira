import type { ContentCollection, ContentKind } from "./types";

export type SectionConfig = {
  collection: ContentCollection;
  kind: ContentKind;
  label: string;
  singular: string;
  publicPath: string;
  description: string;
};

export const sectionConfigs: SectionConfig[] = [
  {
    collection: "publications",
    kind: "publication",
    label: "Publicações",
    singular: "Publicação",
    publicPath: "/publicacoes",
    description: "Registros, notícias e momentos que mantêm a nossa comunidade conectada.",
  },
  {
    collection: "events",
    kind: "event",
    label: "Eventos",
    singular: "Evento",
    publicPath: "/eventos",
    description: "Rodas, encontros e celebrações onde a capoeira ganha ainda mais vida.",
  },
  {
    collection: "initiatives",
    kind: "initiative",
    label: "Iniciativas",
    singular: "Iniciativa",
    publicPath: "/iniciativas",
    description: "Projetos que unem movimento, educação, cultura e transformação social.",
  },
  {
    collection: "team",
    kind: "team",
    label: "Equipe",
    singular: "Membro",
    publicPath: "/equipe",
    description: "As pessoas que guardam, ensinam e renovam os saberes do Chão Batido.",
  },
  {
    collection: "stories",
    kind: "story",
    label: "História",
    singular: "Capítulo",
    publicPath: "/historia",
    description: "Memórias, raízes e caminhos que formam a identidade do nosso grupo.",
  },
  {
    collection: "locations",
    kind: "location",
    label: "Locais",
    singular: "Local",
    publicPath: "/locais",
    description: "Encontre os espaços onde treinamos, convivemos e fazemos a roda acontecer.",
  },
];

export const sectionByCollection = Object.fromEntries(
  sectionConfigs.map((section) => [section.collection, section]),
) as Record<ContentCollection, SectionConfig>;

export function isContentCollection(value: string): value is ContentCollection {
  return value in sectionByCollection;
}
