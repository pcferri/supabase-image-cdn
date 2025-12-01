/**
 * Security utilities for URL signing (optional feature)
 */

/**
 * Generate HMAC-SHA256 signature for URL parameters
 */
export async function generateSignature(
    params: string,
    secret: string,
): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(params);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

    // Convert to hex string
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Verify URL signature
 */
export async function verifySignature(
    searchParams: URLSearchParams,
    secret: string,
): Promise<boolean> {
    const token = searchParams.get("token");
    if (!token) {
        return false;
    }

    // Build params string (excluding token itself)
    const params = new URLSearchParams(searchParams);
    params.delete("token");
    const paramsString = params.toString();

    // Generate expected signature
    const expectedSignature = await generateSignature(paramsString, secret);

    // Compare signatures (constant-time comparison would be better in production)
    return token === expectedSignature;
}

/**
 * Middleware to check URL signature if signing is enabled
 */
export async function checkSignature(
    searchParams: URLSearchParams,
    signingSecret: string | undefined,
): Promise<void> {
    if (!signingSecret) {
        // Signing not enabled, allow all requests
        return;
    }

    const isValid = await verifySignature(searchParams, signingSecret);
    if (!isValid) {
        throw new Error("Invalid or missing signature");
    }
}
