/**
 * Browser Blob download helper.
 *
 * Why this file exists:
 * The create-Blob → object-URL → synthetic <a download> click → revoke dance was
 * duplicated in DataManagement's backup export and is needed again for chat
 * exports and HTML reports. One helper, one cleanup path (the URL is always
 * revoked so blob memory does not leak).
 */

export function downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Filesystem-safe slug for download filenames (kebab-case, max 60 chars). */
export function safeFilename(title: string, fallback = 'export'): string {
    const slug = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
    return slug || fallback;
}
