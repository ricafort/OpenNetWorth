/**
 * Why this file exists:
 * Local LLM mentor replies (and the deterministic offline wisdom fallback) are
 * written in lightweight Markdown: **bold**, *italic*, `code`, "- " bullets,
 * and "> " blockquotes. The chat bubbles used to print that text verbatim, so
 * users saw raw asterisks around words. This component converts that small
 * Markdown subset into real React elements.
 *
 * Tricky logic:
 * - No dangerouslySetInnerHTML and no external Markdown dependency: model
 *   output is treated as text only, so it can never inject HTML.
 * - Inline tokens are parsed per line; a line starting with "- " or "* " becomes
 *   a bullet, "> " becomes a blockquote, "#".."######" becomes a heading, blank
 *   lines separate paragraphs. Heading support matters because local LLMs emit
 *   "### Section" headers and the Consensus Board Summary template uses one —
 *   without a rule they printed raw "###" markers.
 */

'use client';

import React from 'react';

const INLINE_REGEX = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;

function parseInline(text: string, keyBase: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const regex = new RegExp(INLINE_REGEX.source, 'g');
    let last = 0;
    let i = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index));
        const token = match[0];
        if (token.startsWith('**')) {
            nodes.push(<strong key={`${keyBase}-b${i++}`} className="font-bold">{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('`')) {
            nodes.push(<code key={`${keyBase}-c${i++}`} className="font-mono text-[12px] bg-current/10 px-1 rounded">{token.slice(1, -1)}</code>);
        } else {
            nodes.push(<em key={`${keyBase}-i${i++}`}>{token.slice(1, -1)}</em>);
        }
        last = match.index + token.length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
}

export default function RichText({ content, className = '' }: { content: string; className?: string }) {
    const lines = String(content ?? '').replace(/\r\n/g, '\n').split('\n');
    const blocks: React.ReactElement[] = [];
    let bullets: string[] = [];
    let key = 0;

    const flushBullets = () => {
        if (!bullets.length) return;
        const items = bullets;
        bullets = [];
        blocks.push(
            <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 my-1.5">
                {items.map((b, idx) => <li key={idx}>{parseInline(b, `li-${key}-${idx}`)}</li>)}
            </ul>
        );
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line.trim()) {
            flushBullets();
            continue;
        }

        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) {
            bullets.push(bullet[1]);
            continue;
        }
        flushBullets();

        const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
        if (heading) {
            // Levels 1-2 read as section titles, 3+ as sub-labels. Colors inherit
            // from the bubble (light mentor card vs dark consensus card).
            const Tag = heading[1].length <= 2 ? 'h4' : 'h5';
            blocks.push(
                <Tag key={`h-${key++}`} className={`font-black my-1.5 first:mt-0 last:mb-0 ${heading[1].length <= 2 ? 'text-[15px]' : 'text-sm'}`}>
                    {parseInline(heading[2], `h-${key}`)}
                </Tag>
            );
            continue;
        }

        const quote = line.match(/^\s*>\s?(.*)$/);
        if (quote) {
            blocks.push(
                <blockquote key={`q-${key++}`} className="border-l-2 border-current/40 pl-3 italic opacity-90 my-1.5">
                    {parseInline(quote[1], `q-${key}`)}
                </blockquote>
            );
            continue;
        }

        blocks.push(<p key={`p-${key++}`} className="my-1 first:mt-0 last:mb-0">{parseInline(line, `p-${key}`)}</p>);
    }
    flushBullets();

    return <div className={className}>{blocks}</div>;
}
