import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SectionHeading({ eyebrow, title, text, href, linkLabel }: { eyebrow: string; title: string; text?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="section-heading-copy">
        {text ? <p>{text}</p> : null}
        {href && linkLabel ? <Link className="text-link" href={href}>{linkLabel}<ArrowUpRight size={18} /></Link> : null}
      </div>
    </div>
  );
}
