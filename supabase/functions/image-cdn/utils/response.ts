/**
 * HTTP response helper utilities
 */

import type { ImageFormat } from "./params.ts";
import { getMimeType } from "./cache-key.ts";

/**
 * Create a successful image response with proper headers
 */
export function imageResponse(
    imageData: Uint8Array,
    format: ImageFormat,
    options: {
        maxAge?: number;
        immutable?: boolean;
    } = {},
): Response {
    const { maxAge = 31536000, immutable = true } = options;

    const headers = new Headers();
    headers.set("Content-Type", getMimeType(format));

    // Build Cache-Control header
    const cacheDirectives = ["public", `max-age=${maxAge}`];
    if (immutable) {
        cacheDirectives.push("immutable");
    }
    headers.set("Cache-Control", cacheDirectives.join(", "));

    return new Response(imageData.buffer as ArrayBuffer, {
        status: 200,
        headers,
    });
}

/**
 * Create an error response with JSON body
 */
export function errorResponse(
    message: string,
    status: number = 500,
    details?: Record<string, unknown>,
): Response {
    const body = {
        error: message,
        status,
        ...(details && { details }),
    };

    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
    methodNotAllowed: () =>
        errorResponse("Method not allowed. Only GET requests are supported.", 405),

    badRequest: (message: string) => errorResponse(message, 400),

    notFound: (resource: string) =>
        errorResponse(`Resource not found: ${resource}`, 404),

    internalError: (message: string = "Internal server error") =>
        errorResponse(message, 500),

    forbidden: (message: string = "Access forbidden") =>
        errorResponse(message, 403),
};
