import type { ReactNode } from 'react';

/**
 * Safe light-Markdown renderer for blog posts: ## headings, - lists, 1. lists, > quotes,
 * **bold**, *italic* and [links](https://…). Builds React elements — never injects HTML.
 */
export function RichText({ source }: { source: string }) {
    const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

    return (
        <div className="flex flex-col gap-5 text-[18px] leading-[1.75]">
            {blocks.map((block, i) => {
                if (block.startsWith('### ')) return <h3 key={i} className="mt-4 font-display text-2xl font-bold">{inline(block.slice(4))}</h3>;
                if (block.startsWith('## ')) return <h2 key={i} className="mt-6 font-display text-3xl font-extrabold tracking-tight">{inline(block.slice(3))}</h2>;
                if (block.startsWith('> ')) return <blockquote key={i} className="border-s-4 border-saffron ps-5 text-xl font-semibold">{inline(block.replace(/^>\s?/gm, ''))}</blockquote>;
                const lines = block.split('\n');
                if (lines.every((l) => /^[-*] /.test(l))) {
                    return <ul key={i} className="flex list-disc flex-col gap-2 ps-6">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
                }
                if (lines.every((l) => /^\d+\. /.test(l))) {
                    return <ol key={i} className="flex list-decimal flex-col gap-2 ps-6">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>)}</ol>;
                }
                return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
            })}
        </div>
    );
}

function inline(text: string): ReactNode[] {
    const out: ReactNode[] = [];
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = pattern.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
        else if (m[2]) out.push(<em key={k++}>{m[2]}</em>);
        else if (m[3]) out.push(<a key={k++} href={m[4]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-forest underline underline-offset-4">{m[3]}</a>);
        last = pattern.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}
