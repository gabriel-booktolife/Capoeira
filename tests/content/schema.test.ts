import { describe, expect, it } from "vitest";
import { parseContent } from "@/lib/content/schema";
import { formatDate, isNoticeActive, slugify } from "@/lib/content/format";

const image = (order = 0) => ({ url: "https://example.com/image.webp", type: "image" as const, path: `publications/a/${order}.webp`, name: "image.webp", size: 100, order, alt: "", caption: "" });
const video = { ...image(0), url: "https://example.com/video.mp4", type: "video" as const, path: "publications/a/video.mp4", name: "video.mp4", duration: 90 };
const futureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

describe("schemas de conteúdo", () => {
  it("aceita rascunho incompleto, mas valida tipos e limites", () => {
    expect(parseContent("event", { title: "", date: "", sortOrder: 0 }, "draft").status).toBe("draft");
    expect(() => parseContent("team", { age: 131 }, "draft")).toThrow();
  });

  it("exige os campos mínimos apenas ao publicar", () => {
    expect(() => parseContent("event", { title: "Roda", date: futureDate(), description: "" }, "published")).toThrow(/nome, data, horário e local/);
    expect(parseContent("event", { title: "Roda", date: futureDate(), time: "19:00", address: "Praça Central" }, "published").status).toBe("published");
    expect(() => parseContent("event", { title: "Ro", date: futureDate(), time: "19:00", address: "Praça Central" }, "published")).toThrow(/ao menos 3 caracteres/);
    expect(() => parseContent("event", { title: "Roda", date: "2020-01-01", time: "19:00", address: "Praça Central" }, "published")).toThrow(/não pode ser anterior/);
    expect(() => parseContent("team", { name: "Mestra", history: "" }, "published")).toThrow(/nome e história/);
  });

  it("aplica limites e tipos de mídia por domínio", () => {
    expect(parseContent("publication", { title: "Registro", media: [image(0), image(1), image(2), video] }, "published")).toBeTruthy();
    expect(() => parseContent("publication", { title: "Registro", media: [image(0), image(1), image(2), image(3)] }, "published")).toThrow(/3 imagens/);
    expect(() => parseContent("event", { media: [video] }, "draft")).toThrow(/apenas imagens/);
  });

  it("valida horários estruturados", () => {
    expect(() => parseContent("location", { scheduleItems: [{ id: "1", day: "Seg", startTime: "19:00", endTime: "18:00" }] }, "draft")).toThrow(/posterior/);
  });
});

describe("datas, slugs e avisos", () => {
  it("normaliza slugs em português", () => expect(slugify("  Roda de São João!  ")).toBe("roda-de-sao-joao"));
  it("formata datas sem deslocamento de fuso", () => expect(formatDate("2026-08-01")).toContain("01 de agosto de 2026"));
  it("expira avisos no fim do dia de São Paulo", () => {
    expect(isNoticeActive("2026-08-01", new Date("2026-08-02T02:59:59Z"))).toBe(true);
    expect(isNoticeActive("2026-08-01", new Date("2026-08-02T03:00:00Z"))).toBe(false);
  });
});
