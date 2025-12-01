/**
 * Image transformation utilities using ImageScript
 */

import { decode, Image } from "imagescript";
import type { CropPosition, FitMode, ImageFormat, TransformConfig } from "./params.ts";

/**
 * Decode image from bytes (auto-detects format)
 */
async function decodeImage(imageData: Uint8Array): Promise<Image> {
    try {
        return await decode(imageData);
    } catch (error) {
        throw new Error(`Failed to decode image: ${error.message}`);
    }
}

/**
 * Calculate dimensions for resize based on fit mode
 */
function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number | null,
    targetHeight: number | null,
    fit: FitMode,
): { width: number; height: number; shouldCrop: boolean } {
    // If no dimensions specified, keep original
    if (!targetWidth && !targetHeight) {
        return {
            width: originalWidth,
            height: originalHeight,
            shouldCrop: false,
        };
    }

    // If only one dimension specified, calculate the other maintaining aspect ratio
    if (!targetWidth) {
        const ratio = originalWidth / originalHeight;
        return {
            width: Math.round(targetHeight! * ratio),
            height: targetHeight!,
            shouldCrop: false,
        };
    }

    if (!targetHeight) {
        const ratio = originalHeight / originalWidth;
        return {
            width: targetWidth,
            height: Math.round(targetWidth * ratio),
            shouldCrop: false,
        };
    }

    // Both dimensions specified
    const aspectRatio = originalWidth / originalHeight;
    const targetRatio = targetWidth / targetHeight;

    switch (fit) {
        case "fill":
            // Force exact dimensions (may distort)
            return {
                width: targetWidth,
                height: targetHeight,
                shouldCrop: false,
            };

        case "contain": {
            // Fit inside, maintain aspect ratio (may have empty space)
            if (aspectRatio > targetRatio) {
                // Image is wider than target
                return {
                    width: targetWidth,
                    height: Math.round(targetWidth / aspectRatio),
                    shouldCrop: false,
                };
            } else {
                // Image is taller than target
                return {
                    width: Math.round(targetHeight * aspectRatio),
                    height: targetHeight,
                    shouldCrop: false,
                };
            }
        }

        case "cover":
        default: {
            // Cover entire area, maintain aspect ratio (may crop)
            if (aspectRatio > targetRatio) {
                // Image is wider - fit to height, crop width
                return {
                    width: Math.round(targetHeight * aspectRatio),
                    height: targetHeight,
                    shouldCrop: true,
                };
            } else {
                // Image is taller - fit to width, crop height
                return {
                    width: targetWidth,
                    height: Math.round(targetWidth / aspectRatio),
                    shouldCrop: true,
                };
            }
        }
    }
}

/**
 * Apply crop based on position
 */
function applyCrop(
    image: Image,
    targetWidth: number,
    targetHeight: number,
    position: CropPosition,
): Image {
    const { width, height } = image;

    if (width === targetWidth && height === targetHeight) {
        return image; // No crop needed
    }

    let x = 0;
    let y = 0;

    // Calculate crop position
    switch (position) {
        case "center":
            x = Math.round((width - targetWidth) / 2);
            y = Math.round((height - targetHeight) / 2);
            break;
        case "top":
            x = Math.round((width - targetWidth) / 2);
            y = 0;
            break;
        case "bottom":
            x = Math.round((width - targetWidth) / 2);
            y = height - targetHeight;
            break;
        case "left":
            x = 0;
            y = Math.round((height - targetHeight) / 2);
            break;
        case "right":
            x = width - targetWidth;
            y = Math.round((height - targetHeight) / 2);
            break;
    }

    return image.crop(x, y, targetWidth, targetHeight);
}

/**
 * Parse hex color to RGB values
 */
function parseHexColor(hex: string): number {
    // Convert hex (e.g., "ffffff") to number
    return parseInt(hex, 16);
}

/**
 * Apply background color (for contain mode with transparency)
 */
function applyBackground(image: Image, bgColor: string | null): Image {
    if (!bgColor) return image;

    const color = parseHexColor(bgColor);
    const newImage = new Image(image.width, image.height);
    newImage.fill(color);
    newImage.composite(image);

    return newImage;
}

/**
 * Encode image to target format
 */
async function encodeImage(
    image: Image,
    format: ImageFormat,
    quality: number,
): Promise<Uint8Array> {
    try {
        switch (format) {
            case "jpeg":
                return await image.encodeJPEG(quality);
            case "png":
                return await image.encodePNG();
            case "webp":
                return await image.encodeWEBP(quality);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    } catch (error) {
        throw new Error(`Failed to encode image: ${error.message}`);
    }
}

/**
 * Transform image according to configuration
 */
export async function transformImage(
    imageData: Uint8Array,
    config: TransformConfig,
    originalFormat: ImageFormat,
): Promise<{ data: Uint8Array; format: ImageFormat }> {
    // Decode image
    let image = await decodeImage(imageData);

    // Calculate target dimensions
    const { width, height, shouldCrop } = calculateDimensions(
        image.width,
        image.height,
        config.width,
        config.height,
        config.fit,
    );

    // Resize image
    if (width !== image.width || height !== image.height) {
        image = image.resize(width, height);
    }

    // Apply crop if needed (for cover mode)
    if (shouldCrop && config.width && config.height) {
        image = applyCrop(image, config.width, config.height, config.crop);
    }

    // Apply background color for contain/fill modes if specified
    if ((config.fit === "contain" || config.fit === "fill") && config.background) {
        image = applyBackground(image, config.background);
    }

    // Determine output format
    const outputFormat = config.format || originalFormat;

    // Encode to target format
    const encodedData = await encodeImage(image, outputFormat, config.quality);

    return {
        data: encodedData,
        format: outputFormat,
    };
}
