/**
 * Query parameter parsing and validation utilities
 */

export type FitMode = "cover" | "contain" | "fill";
export type ImageFormat = "jpeg" | "png";
export type CropPosition = "center" | "top" | "bottom" | "left" | "right";

export interface TransformConfig {
    bucket: string;
    path: string;
    width: number | null;
    height: number | null;
    fit: FitMode;
    format: ImageFormat | null;
    quality: number;
    background: string | null;
    crop: CropPosition;
    noCache: boolean;
}

export interface ValidationLimits {
    maxWidth: number;
    maxHeight: number;
    defaultQuality: number;
    defaultBucket: string;
}

/**
 * Sanitize file path to prevent directory traversal attacks
 */
export function sanitizePath(path: string): string {
    // Remove leading/trailing slashes
    let sanitized = path.trim().replace(/^\/+|\/+$/g, "");

    // Prevent path traversal
    if (sanitized.includes("..") || sanitized.startsWith("/")) {
        throw new Error("Invalid path: path traversal detected");
    }

    // Ensure path is not empty
    if (!sanitized) {
        throw new Error("Invalid path: path cannot be empty");
    }

    return sanitized;
}

/**
 * Parse and validate integer parameter
 */
function parseIntParam(
    value: string | null,
    min: number = 1,
    max: number = Infinity,
): number | null {
    if (!value) return null;

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }

    if (parsed < min || parsed > max) {
        throw new Error(`Number out of range: ${value} (min: ${min}, max: ${max})`);
    }

    return parsed;
}

/**
 * Validate fit mode parameter
 */
function parseFitMode(value: string | null): FitMode {
    if (!value) return "cover"; // default

    const validModes: FitMode[] = ["cover", "contain", "fill"];
    if (!validModes.includes(value as FitMode)) {
        throw new Error(
            `Invalid fit mode: ${value}. Allowed values: ${validModes.join(", ")}`,
        );
    }

    return value as FitMode;
}

/**
 * Validate image format parameter
 */
function parseFormat(value: string | null): ImageFormat | null {
    if (!value) return null; // keep original format

    const validFormats: ImageFormat[] = ["jpeg", "png"];
    if (!validFormats.includes(value as ImageFormat)) {
        throw new Error(
            `Invalid format: ${value}. Allowed values: ${validFormats.join(", ")}`,
        );
    }

    return value as ImageFormat;
}

/**
 * Validate crop position parameter
 */
function parseCropPosition(value: string | null): CropPosition {
    if (!value) return "center"; // default

    const validPositions: CropPosition[] = [
        "center",
        "top",
        "bottom",
        "left",
        "right",
    ];
    if (!validPositions.includes(value as CropPosition)) {
        throw new Error(
            `Invalid crop position: ${value}. Allowed values: ${validPositions.join(", ")
            }`,
        );
    }

    return value as CropPosition;
}

/**
 * Validate background color (hex format without #)
 */
function parseBackground(value: string | null): string | null {
    if (!value) return null;

    // Validate hex color format (without #)
    if (!/^[0-9A-Fa-f]{6}$/.test(value)) {
        throw new Error(
            `Invalid background color: ${value}. Expected 6-digit hex (e.g., ffffff)`,
        );
    }

    return value;
}

/**
 * Parse and validate all query parameters
 */
export function parseQueryParams(
    searchParams: URLSearchParams,
    limits: ValidationLimits,
): TransformConfig {
    // Required parameters
    const bucket = searchParams.get("bucket") || limits.defaultBucket;
    const rawPath = searchParams.get("path");

    if (!rawPath) {
        throw new Error("Missing required parameter: path");
    }

    const path = sanitizePath(rawPath);

    // Transformation parameters
    const width = parseIntParam(searchParams.get("w"), 1, limits.maxWidth);
    const height = parseIntParam(searchParams.get("h"), 1, limits.maxHeight);
    const fit = parseFitMode(searchParams.get("fit"));
    const format = parseFormat(searchParams.get("format"));
    const quality = parseIntParam(searchParams.get("q"), 1, 100) ||
        limits.defaultQuality;
    const background = parseBackground(searchParams.get("bg"));
    const crop = parseCropPosition(searchParams.get("crop"));
    const noCache = searchParams.get("no_cache") === "1";

    return {
        bucket,
        path,
        width,
        height,
        fit,
        format,
        quality,
        background,
        crop,
        noCache,
    };
}
