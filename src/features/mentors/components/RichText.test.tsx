/**
 * @vitest-environment happy-dom
 */
/**
 * Tests for RichText: the Markdown-lite renderer used by mentor chat bubbles.
 * Verifies **bold**, *italic*, `code`, "- " bullets, "> " blockquotes, and
 * "#".."######" headings render as real elements with no raw markers leaking
 * into the visible text.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RichText from './RichText';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('RichText Markdown-lite renderer', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const render = (content: string) => {
        act(() => {
            root.render(<RichText content={content} />);
        });
    };

    it('renders bold amounts as <strong> with no visible asterisks', () => {
        render('With **$1,255,770 AUD** net worth, **zero liabilities**, and a **$10,722 monthly surplus**, your posture is unusually strong.');
        const strongs = container.querySelectorAll('strong');
        expect(strongs.length).toBe(3);
        expect(strongs[0].textContent).toBe('$1,255,770 AUD');
        expect(container.textContent).not.toContain('**');
    });

    it('renders italic emphasis as <em>', () => {
        render('*Focus on the controllable variables.*');
        const em = container.querySelector('em');
        expect(em).toBeTruthy();
        expect(em!.textContent).toBe('Focus on the controllable variables.');
        expect(container.textContent).not.toContain('*');
    });

    it('groups consecutive "- " lines into a single <ul>', () => {
        render('- Is your cash flow aligned with your values?\n- Are you investing for freedom, or just comfort?');
        const lists = container.querySelectorAll('ul');
        expect(lists.length).toBe(1);
        expect(lists[0].querySelectorAll('li').length).toBe(2);
    });

    it('renders "> " lines as blockquotes with inline formatting inside', () => {
        render('> Tip: *Start Strata* to enable live chat.');
        const quote = container.querySelector('blockquote');
        expect(quote).toBeTruthy();
        expect(quote!.querySelector('em')?.textContent).toBe('Start Strata');
        expect(container.textContent).not.toContain('>');
    });

    it('renders inline `code` spans', () => {
        render('Run `ollama run llama3.2` in terminal.');
        const code = container.querySelector('code');
        expect(code).toBeTruthy();
        expect(code!.textContent).toBe('ollama run llama3.2');
    });

    it('renders "###" heading lines as real headings with no raw markers', () => {
        // Mirrors the Consensus Board Summary template in MentorsPage, which led with
        // "### Consensus Board Summary" and previously displayed the hashes verbatim.
        render('### Consensus Board Summary\n\nBased on the shared wisdom of the board, we find common ground.');
        const heading = container.querySelector('h5');
        expect(heading).toBeTruthy();
        expect(heading!.textContent).toBe('Consensus Board Summary');
        expect(container.textContent).not.toContain('###');
    });

    it('keeps plain text untouched and separates paragraphs', () => {
        render('True wealth is not just a balance sheet.\n\nIt is discipline.');
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBe(2);
        expect(paragraphs[0].textContent).toBe('True wealth is not just a balance sheet.');
    });
});
