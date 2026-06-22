import React, { type ReactNode } from "react";
import {
  getSafeReviewLink,
  parseReviewContent,
  type ReviewContentBlock
} from "@/lib/reviewContent";

export function ReviewContent({ body, className = "" }: { body: string; className?: string }) {
  const blocks = parseReviewContent(body);

  if (!blocks.length) {
    return <p className="text-sm font-semibold text-walnut/55">La vista previa aparecerá aquí.</p>;
  }

  return (
    <div className={`review-prose ${className}`}>
      {blocks.map((block, index) => <ReviewBlock key={`${block.type}-${index}`} block={block} />)}
    </div>
  );
}

function ReviewBlock({ block }: { block: ReviewContentBlock }) {
  if (block.type === "heading") {
    return block.level === 2 ? (
      <div className="mt-12 mb-5 pt-6 border-t border-walnut/10 first:mt-0 first:border-0 first:pt-0">
        <h2 className="text-2xl sm:text-3xl leading-tight">{renderInlineReviewText(block.text)}</h2>
      </div>
    ) : (
      <div className="mt-8 mb-4">
        <h3 className="text-xl sm:text-2xl leading-tight">{renderInlineReviewText(block.text)}</h3>
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <figure className="my-8 overflow-hidden rounded-xl border border-walnut/15 bg-white/65 p-2 shadow-soft">
        {/* User-authored remote images stay browser-direct to avoid proxying them through Vercel/Supabase. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="mx-auto max-h-[620px] w-auto rounded-lg object-contain"
        />
        {block.alt ? <figcaption className="px-2 pb-1 pt-3 text-center text-sm italic text-walnut/60">{block.alt}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "unordered-list" || block.type === "ordered-list") {
    const List = block.type === "ordered-list" ? "ol" : "ul";
    return (
      <List>
        {block.items.map((item, index) => <li key={index}>{renderInlineReviewText(item)}</li>)}
      </List>
    );
  }

  if (block.type === "quote") {
    return <blockquote>{renderInlineReviewText(block.text)}</blockquote>;
  }

  return <p>{renderInlineReviewText(block.text)}</p>;
}

function renderInlineReviewText(value: string) {
  const tokenPattern = /(\*\*[^*\n]+\*\*|_[^_\n]+_|\[[^\]\n]+\]\([^)\s\n]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const start = match.index || 0;
    if (start > cursor) nodes.push(value.slice(cursor, start));
    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(<strong key={start}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("_")) {
      nodes.push(<em key={start}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link ? getSafeReviewLink(link[2]) : null;
      nodes.push(href ? (
        <a key={start} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
          {link?.[1]}
        </a>
      ) : link?.[1] || token);
    }
    cursor = start + token.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

