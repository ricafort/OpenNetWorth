export async function generateVerificationHash(data: object): Promise<string> {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(json);

    // Use SHA-256 for a standard secure hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Return first 16 chars for a "short hash" ID look, or full for security?
    // Let's return a readable format: "CW-VERIFY-[First 8]"
    return `CW-VERIFY-${hashHex.substring(0, 8).toUpperCase()}-${hashHex.substring(8, 16).toUpperCase()}`;
}
