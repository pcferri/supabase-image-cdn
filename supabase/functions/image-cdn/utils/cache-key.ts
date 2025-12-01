/**
 * Cache key generation utilities
 */

import type { ImageFormat, TransformConfig } from "./params.ts";

/**
 * Get file extension from format
 */
export function getExtensionFromFormat(format: ImageFormat): string {
    const extensions: Record<ImageFormat, string> = {
        jpeg: "jpg",
        png: "png",
    };
    return extensions[format];
}

/**
 * Get MIME type from format
 */
export function getMimeType(format: ImageFormat): string {
    const mimeTypes: Record<ImageFormat, string> = {
        jpeg: "image/jpeg",
        png: "image/png",
    };
    return mimeTypes[format];
}

/**
 * Infer format from file extension
 */
export function inferFormatFromPath(path: string): ImageFormat {
    const ext = path.split(".").pop()?.toLowerCase();

    switch (ext) {
        case "jpg":
        case "jpeg":
            return "jpeg";
        case "png":
            return "png";
        default:
            return "jpeg"; // default fallback
    }
}

/**
 * Build deterministic cache key from transformation config
 * Format: <path>__w=<width>__h=<height>__fit=<fit>__fmt=<format>__q=<quality>.<ext>
 * 
 * Only includes non-default parameters to minimize cache fragmentation
 */
export function buildCacheKey(config: TransformConfig): string {
    const parts: string[] = [];
    const originalFormat = inferFormatFromPath(config.path);
    const outputFormat = config.format || originalFormat;

    // Start with the original path (without extension)
    const pathWithoutExt = config.path.replace(/\.[^.]+$/, "");
    parts.push(pathWithoutExt);

    // Add transformation parameters (only if specified)
    if (config.width) {
        parts.push(`w=${config.width}`);
    }

    if (config.height) {
        parts.push(`h=${config.height}`);
    }

    // Only add fit if not default (cover) or if dimensions are specified
    if (config.fit !== "cover" && (config.width || config.height)) {
        parts.push(`fit=${config.fit}`);
    }

    // Add format if different from original
    if (config.format && config.format !== originalFormat) {
        parts.push(`fmt=${config.format}`);
    }

    // Add quality if not default (80)
    if (config.quality !== 80) {
        parts.push(`q=${config.quality}`);
    }

    // Add background color if specified (for contain/fill modes)
    if (config.background) {
        parts.push(`bg=${config.background}`);
    }

    // Add crop position if not default (center)
    if (config.crop !== "center" && (config.width || config.height)) {
        parts.push(`crop=${config.crop}`);
    }

    // Join all parts with double underscore as separator
    const cacheKey = parts.join("__");

    // Add appropriate extension
    const ext = getExtensionFromFormat(outputFormat);

    return `${cacheKey}.${ext}`;
}
