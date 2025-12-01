/**
 * Supabase Image CDN Edge Function
 * 
 * A serverless image transformation and caching service
 * Provides Cloudinary-like functionality with Supabase Storage
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { parseQueryParams, type ValidationLimits } from "./utils/params.ts";
import { buildCacheKey, inferFormatFromPath } from "./utils/cache-key.ts";
import { ErrorResponses, imageResponse } from "./utils/response.ts";
import { transformImage } from "./utils/image.ts";
import { checkSignature } from "./utils/security.ts";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CACHE_BUCKET = Deno.env.get("CACHE_BUCKET") ?? "images-cache";
const IMAGE_CDN_SIGNING_SECRET = Deno.env.get("IMAGE_CDN_SIGNING_SECRET");

// Validation limits from environment
const limits: ValidationLimits = {
    maxWidth: parseInt(Deno.env.get("MAX_WIDTH") ?? "2000", 10),
    maxHeight: parseInt(Deno.env.get("MAX_HEIGHT") ?? "2000", 10),
    defaultQuality: parseInt(Deno.env.get("DEFAULT_QUALITY") ?? "80", 10),
    defaultBucket: Deno.env.get("ORIGIN_DEFAULT_BUCKET") ?? "images",
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Main request handler
 */
serve(async (req: Request) => {
    const startTime = Date.now();

    try {
        // Only allow GET requests
        if (req.method !== "GET") {
            return ErrorResponses.methodNotAllowed();
        }

        // Parse URL and query parameters
        const url = new URL(req.url);
        const searchParams = url.searchParams;

        // Check URL signature if enabled
        try {
            await checkSignature(searchParams, IMAGE_CDN_SIGNING_SECRET);
        } catch (error) {
            console.error("Signature verification failed:", error.message);
            return ErrorResponses.forbidden("Invalid or missing signature");
        }

        // Parse and validate parameters
        let config;
        try {
            config = parseQueryParams(searchParams, limits);
        } catch (error) {
            console.error("Parameter validation failed:", error.message);
            return ErrorResponses.badRequest(error.message);
        }

        console.log("Processing request:", {
            bucket: config.bucket,
            path: config.path,
            transformations: {
                width: config.width,
                height: config.height,
                fit: config.fit,
                format: config.format,
                quality: config.quality,
            },
        });

        // Generate cache key
        const cacheKey = buildCacheKey(config);
        console.log("Cache key:", cacheKey);

        // Check if cached version exists (unless no_cache is set)
        if (!config.noCache) {
            try {
                const { data: cachedData, error: cacheError } = await supabase.storage
                    .from(CACHE_BUCKET)
                    .download(cacheKey);

                if (!cacheError && cachedData) {
                    console.log("Cache HIT - returning cached image");
                    const cachedBytes = new Uint8Array(await cachedData.arrayBuffer());
                    const outputFormat = config.format || inferFormatFromPath(config.path);

                    const duration = Date.now() - startTime;
                    console.log(`Request completed in ${duration}ms (cached)`);

                    return imageResponse(cachedBytes, outputFormat);
                }
            } catch (error) {
                // Cache miss or error - continue to processing
                console.log("Cache MISS - will process image");
            }
        } else {
            console.log("Cache bypassed (no_cache=1)");
        }

        // Download original image
        console.log("Downloading original image from bucket:", config.bucket);
        const { data: originData, error: originError } = await supabase.storage
            .from(config.bucket)
            .download(config.path);

        if (originError || !originData) {
            console.error("Failed to download original image:", originError);
            return ErrorResponses.notFound(`${config.bucket}/${config.path}`);
        }

        // Convert to Uint8Array
        const originBytes = new Uint8Array(await originData.arrayBuffer());
        console.log(`Downloaded ${originBytes.length} bytes`);

        // Transform image
        console.log("Transforming image...");
        const originalFormat = inferFormatFromPath(config.path);
        const { data: transformedData, format: outputFormat } = await transformImage(
            originBytes,
            config,
            originalFormat,
        );
        console.log(`Transformation complete - output: ${transformedData.length} bytes`);

        // Upload to cache bucket
        try {
            console.log("Uploading to cache bucket...");
            const { error: uploadError } = await supabase.storage
                .from(CACHE_BUCKET)
                .upload(cacheKey, transformedData, {
                    upsert: true,
                    contentType: `image/${outputFormat}`,
                    cacheControl: "31536000", // 1 year
                });

            if (uploadError) {
                console.error("Failed to upload to cache:", uploadError);
                // Continue anyway - we can still return the transformed image
            } else {
                console.log("Successfully cached transformed image");
            }
        } catch (error) {
            console.error("Cache upload error:", error);
            // Continue anyway
        }

        const duration = Date.now() - startTime;
        console.log(`Request completed in ${duration}ms (processed)`);

        // Return transformed image
        return imageResponse(transformedData, outputFormat);
    } catch (error) {
        console.error("Unhandled error:", error);
        return ErrorResponses.internalError(
            error.message || "An unexpected error occurred",
        );
    }
});
