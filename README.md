# Supabase Image CDN

A serverless image transformation and caching service built on Supabase Edge
Functions, providing **Cloudinary-like functionality** with automatic caching in
Supabase Storage.

## ✨ Features

- **Real-time Image Transformations**: Resize, crop, and convert images
  on-the-fly
- **Intelligent Caching**: Transformed images are automatically cached in
  Supabase Storage
- **Multiple Fit Modes**: `cover`, `contain`, and `fill` to handle different use
  cases
- **Format Conversion**: Convert between JPEG and PNG
- **Quality Control**: Adjust compression quality for optimal file sizes
- **Crop Positioning**: Choose crop anchor points (center, top, bottom, left,
  right)
- **Background Colors**: Add background colors for transparent images
- **Security**: Optional URL signing with HMAC-SHA256
- **CDN-Ready**: Leverage Supabase's global CDN for fast delivery
- **Cost-Effective**: Pay only for what you use with Supabase pricing

## 🏗️ Architecture

```
Client Request → Supabase Edge Function → Check Cache
                                         ↓ (miss)
                                    Download Original
                                         ↓
                                    Transform Image
                                         ↓
                                    Upload to Cache
                                         ↓
                                    Return Image
```

## 📦 Prerequisites

- [Supabase account](https://supabase.com/) (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Basic understanding of Supabase Storage

## 🚀 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pcferri/supabase-image-cdn.git
cd supabase-image-cdn
```

### 2. Initialize Supabase (if needed)

If this is a new project:

```bash
supabase init
```

### 3. Create Storage Buckets

You need two buckets:

1. **Origin bucket** (e.g., `images`) - stores your original images
2. **Cache bucket** (e.g., `images-cache`) - stores transformed versions

Create them via the Supabase Dashboard or CLI:

```bash
# Using Supabase Dashboard:
# 1. Go to Storage → Create bucket
# 2. Create "images" bucket (configure access as needed)
# 3. Create "images-cache" bucket (make it public for direct access)
```

**Important**: The cache bucket should be **public** so transformed images can
be served directly.

### 4. Configure Environment Variables

Set these environment variables in your Supabase project (Dashboard → Edge
Functions → Settings):

| Variable                    | Description                  | Default        | Required |
| --------------------------- | ---------------------------- | -------------- | -------- |
| `SUPABASE_URL`              | Your Supabase URL            | Auto-injected  | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key             | Auto-injected  | ✅       |
| `ORIGIN_DEFAULT_BUCKET`     | Default origin bucket        | `images`       | ❌       |
| `CACHE_BUCKET`              | Cache bucket name            | `images-cache` | ❌       |
| `MAX_WIDTH`                 | Maximum image width          | `2000`         | ❌       |
| `MAX_HEIGHT`                | Maximum image height         | `2000`         | ❌       |
| `DEFAULT_QUALITY`           | Default quality (1-100)      | `80`           | ❌       |
| `ALLOW_PUBLIC_ACCESS`       | Allow unauthenticated access | `true`         | ❌       |
| `IMAGE_CDN_SIGNING_SECRET`  | Secret for URL signing       | -              | ❌       |

### 5. Deploy the Edge Function

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy image-cdn
```

### 6. Test the Deployment

Upload a test image to your `images` bucket, then try:

```bash
curl "https://YOUR_PROJECT.functions.supabase.co/image-cdn?bucket=images&path=test.jpg&w=400&format=png" -o test.png
```

## 🧪 Local Testing

### Prerequisites for Local Development

Before testing locally, ensure you have:

1. **Supabase CLI** - Install using one of these methods:

   **Windows (PowerShell):**
   ```powershell
   # Using Scoop
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase

   # OR using Chocolatey
   choco install supabase
   ```

   **macOS:**
   ```bash
   brew install supabase/tap/supabase
   ```

   **Linux:**
   ```bash
   brew install supabase/tap/supabase
   ```

   Or download directly from: https://github.com/supabase/cli/releases

2. **Docker Desktop** - Required for local Supabase instance
   - Download: https://www.docker.com/products/docker-desktop/
   - Ensure Docker is running before proceeding

3. **Verify installations:**
   ```bash
   supabase --version
   docker --version
   ```

### Step-by-Step Local Testing

#### 1. Start Local Supabase Instance

```bash
cd supabase-image-cdn
supabase start
```

⏱️ **First run**: May take 5-10 minutes to download Docker images.

When complete, you'll see output like:

```
API URL: http://localhost:54321
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

**⚠️ Important**: Copy the credentials - you'll need them!

#### 2. Create Storage Buckets

1. Open Supabase Studio: http://localhost:54323
2. Navigate to **Storage** in the sidebar
3. Create two buckets:
   - **`images`** - Origin bucket (can be private or public)
   - **`images-cache`** - Cache bucket (**must be public**)

**Making a bucket public:**

- When creating: Check "Public bucket"
- Or go to: Storage → Bucket → Policies → Add "SELECT for PUBLIC"

#### 3. Upload Test Image

1. In Supabase Studio (http://localhost:54323)
2. Go to **Storage** → **images**
3. Upload any image file (e.g., `test.jpg`)

#### 4. Configure Local Environment Variables

Update `.env.local` with your **local** credentials from Step 1:

```env
# Supabase Local Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key from step 1>

# Storage Buckets
ORIGIN_DEFAULT_BUCKET=images
CACHE_BUCKET=images-cache

# Image Transformation Limits
MAX_WIDTH=2000
MAX_HEIGHT=2000
DEFAULT_QUALITY=80

# Access Control
ALLOW_PUBLIC_ACCESS=true
```

#### 5. Serve the Edge Function Locally

```bash
supabase functions serve image-cdn --env-file .env.local
```

The function will be available at:
**http://localhost:54321/functions/v1/image-cdn**

### Testing Examples

#### Test 1: Basic Resize

```bash
# Resize to 400px width
curl "http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&w=400" -o test-400.jpg
```

#### Test 2: Create Thumbnail

```bash
# 256x256 square thumbnail in png
curl "http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&w=256&h=256&fit=cover&format=png&q=80" -o thumbnail.png
```

#### Test 3: Format Conversion

```bash
# Convert to png with quality 90
curl "http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&format=png&q=90" -o test.png
```

#### Test 4: Verify Caching

```bash
# First call (cache miss - slower)
time curl "http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&w=800" -o test-800-1.jpg

# Second call (cache hit - much faster!)
time curl "http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&w=800" -o test-800-2.jpg
```

You should see a significant speed difference!

#### Test 5: Browser Testing

Open in your browser:

```
http://localhost:54321/functions/v1/image-cdn?bucket=images&path=test.jpg&w=600&format=png
```

The image should display directly!

### Monitoring Logs

To see real-time logs with debug information:

```bash
supabase functions serve image-cdn --env-file .env.local --debug
```

You'll see messages like:

- `Cache HIT - returning cached image`
- `Cache MISS - will process image`
- Download, transformation, and upload information

### Verify Cache

After transformations:

1. Go to **Storage** → **images-cache** in Supabase Studio
2. You should see cached files with names like:
   `images/test.jpg-w800-cover-jpeg-q80`

### Stopping Local Services

When finished testing:

```bash
# Stop Supabase local instance
supabase stop

# OR reset everything (deletes data)
supabase stop --no-backup
```

### Common Issues

#### Docker Not Running

**Error**: "Docker daemon is not running"\
**Solution**: Start Docker Desktop and wait for it to fully initialize

#### Image Not Found (404)

**Solutions**:

- Verify image was uploaded to the `images` bucket
- Check file name (case-sensitive!)
- Confirm bucket name is correct

#### Failed to Upload to Cache

**Solutions**:

- Verify `images-cache` bucket exists
- Ensure bucket has correct permissions
- Check `CACHE_BUCKET` value in `.env.local`

#### Permission Error (403)

**Solution**: Configure access policies in Supabase Studio:

1. Storage → Bucket → Policies
2. Add SELECT policy for PUBLIC (for public buckets)

### Local Testing Checklist

- [ ] Supabase CLI installed
- [ ] Docker Desktop running
- [ ] `supabase start` executed successfully
- [ ] Buckets `images` and `images-cache` created
- [ ] Bucket `images-cache` is public
- [ ] Test image uploaded to `images` bucket
- [ ] `.env.local` configured with local credentials
- [ ] Function served locally (`supabase functions serve`)
- [ ] Basic resize test successful
- [ ] Cache verified in `images-cache` bucket
- [ ] Logs show `Cache HIT` on second request

## 📖 API Reference

### Endpoint

```
GET https://YOUR_PROJECT.functions.supabase.co/image-cdn
```

### Query Parameters

#### Required Parameters

| Parameter | Type   | Description         | Example             |
| --------- | ------ | ------------------- | ------------------- |
| `bucket`  | string | Source bucket name  | `images`            |
| `path`    | string | File path in bucket | `products/shoe.jpg` |

#### Transformation Parameters

| Parameter | Type    | Description               | Values                                     | Default  |
| --------- | ------- | ------------------------- | ------------------------------------------ | -------- |
| `w`       | integer | Target width in pixels    | 1-MAX_WIDTH                                | -        |
| `h`       | integer | Target height in pixels   | 1-MAX_HEIGHT                               | -        |
| `fit`     | string  | Resize fit mode           | `cover`, `contain`, `fill`                 | `cover`  |
| `format`  | string  | Output format             | `jpeg`, `png`                              | original |
| `q`       | integer | Quality for lossy formats | 1-100                                      | 80       |
| `bg`      | string  | Background color (hex)    | `ffffff`, `000000`                         | -        |
| `crop`    | string  | Crop position             | `center`, `top`, `bottom`, `left`, `right` | `center` |

#### Control Parameters

| Parameter  | Type   | Description                          | Values |
| ---------- | ------ | ------------------------------------ | ------ |
| `no_cache` | string | Skip cache (force reprocess)         | `1`    |
| `token`    | string | Signature token (if signing enabled) | -      |

### Fit Modes Explained

#### `cover` (default)

Maintains aspect ratio and fills the entire target area. **Crops excess** if
needed.

```
Original: 1000×800 → w=400&h=400&fit=cover → 400×400 (cropped)
```

Best for: Thumbnails, profile pictures, cards

#### `contain`

Maintains aspect ratio and fits inside target area. **May have empty space**.

```
Original: 1000×800 → w=400&h=400&fit=contain → 400×320 (no crop)
```

Best for: Product images, logos

#### `fill`

Forces exact dimensions. **May distort** the image.

```
Original: 1000×800 → w=400&h=400&fit=fill → 400×400 (stretched)
```

Best for: Special cases where exact dimensions are critical

## 💡 Usage Examples

### Basic Resize

Resize to 800px width, maintain aspect ratio:

```
/image-cdn?bucket=images&path=banner.jpg&w=800
```

### Thumbnail with Cover Crop

Create a square thumbnail (crop excess):

```
/image-cdn?bucket=images&path=avatar.png&w=256&h=256&fit=cover&format=png&q=80
```

### Product Image with Contain

Fit product image without cropping:

```
/image-cdn?bucket=images&path=products/shoe.jpg&w=600&h=600&fit=contain&bg=ffffff
```

### Format Conversion

Convert JPG to PNG with quality:

```
/image-cdn?bucket=images&path=logo.jpg&format=png&q=90
```

### Responsive Images

Generate multiple sizes for responsive design:

```html
<img
  src="/image-cdn?bucket=images&path=hero.jpg&w=400&format=png"
  srcset="/image-cdn?bucket=images&path=hero.jpg&w=800&format=png 2x,
          /image-cdn?bucket=images&path=hero.jpg&w=1200&format=png 3x"
  alt="Hero image"
/>
```

### Custom Crop Position

Crop from the top (useful for portraits):

```
/image-cdn?bucket=images&path=portrait.jpg&w=400&h=500&fit=cover&crop=top
```

## 🔒 Security: URL Signing (Optional)

To prevent unauthorized transformations, enable URL signing:

### 1. Set Signing Secret

Add `IMAGE_CDN_SIGNING_SECRET` to your environment variables:

```bash
IMAGE_CDN_SIGNING_SECRET=your-random-secret-key-here
```

### 2. Generate Signed URLs

You'll need to generate HMAC-SHA256 signatures in your backend:

```javascript
// Example: Node.js
const crypto = require("crypto");

function generateSignedUrl(params) {
  // Build params string (excluding token)
  const paramsString = new URLSearchParams(params).toString();

  // Generate HMAC signature
  const signature = crypto
    .createHmac("sha256", process.env.IMAGE_CDN_SIGNING_SECRET)
    .update(paramsString)
    .digest("hex");

  // Return full URL with token
  return `https://YOUR_PROJECT.functions.supabase.co/image-cdn?${paramsString}&token=${signature}`;
}

// Usage
const signedUrl = generateSignedUrl({
  bucket: "images",
  path: "products/shoe.jpg",
  w: 800,
  h: 600,
  fit: "cover",
  format: "png",
  q: 80,
});
```

```python
# Example: Python
import hmac
import hashlib
from urllib.parse import urlencode

def generate_signed_url(params, secret):
    # Build params string
    params_string = urlencode(params)
    
    # Generate HMAC signature
    signature = hmac.new(
        secret.encode(),
        params_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Return full URL with token
    base_url = "https://YOUR_PROJECT.functions.supabase.co/image-cdn"
    return f"{base_url}?{params_string}&token={signature}"

# Usage
signed_url = generate_signed_url({
    'bucket': 'images',
    'path': 'products/shoe.jpg',
    'w': 800,
    'h': 600,
    'fit': 'cover',
    'format': 'png',
    'q': 80
}, 'your-secret-key')
```

### 3. Requests Without Valid Signature

Will receive a `403 Forbidden` response.

## 🎯 Best Practices

### 1. Use png When Possible

png typically produces 25-35% smaller files than JPEG:

```
format=png&q=80
```

### 2. Set Appropriate Quality

- **Photos**: `q=75-85` (good balance)
- **Graphics/Text**: `q=85-95` (higher quality)
- **Thumbnails**: `q=60-75` (smaller size)

### 3. Leverage Browser Caching

Transformed images have `Cache-Control: public, max-age=31536000, immutable`
headers. Browsers will cache them for 1 year.

### 4. Predefine Common Sizes

Define standard sizes (e.g., thumbnail, medium, large) in your application to
maximize cache hits:

```javascript
const SIZES = {
  thumbnail: "w=150&h=150&fit=cover",
  medium: "w=600&h=600&fit=contain",
  large: "w=1200&fit=contain",
};
```

### 5. Monitor Cache Bucket Size

Cached transformations accumulate over time. Monitor your `images-cache` bucket
size and set up lifecycle policies if needed.

### 6. Set Dimension Limits

Prevent abuse by setting appropriate `MAX_WIDTH` and `MAX_HEIGHT` environment
variables (default: 2000px).

## 📊 Performance Considerations

### Cache Performance

- **First request** (cache miss): 500-2000ms (depends on image size and
  transformations)
- **Subsequent requests** (cache hit): 50-200ms (CDN delivery)

### Memory Limits

Edge Functions have memory constraints (~50MB per execution). Very large images
(>10MB) may cause issues:

- Set reasonable dimension limits via `MAX_WIDTH`/`MAX_HEIGHT`
- Consider pre-processing extremely large images
- Monitor function logs for memory errors

### Timeout Limits

Edge Functions have execution time limits. Complex transformations on large
images may timeout:

- Keep source images reasonably sized
- Use moderate dimension targets
- Monitor function logs for timeout errors

## 🛠️ Troubleshooting

### Image Not Found (404)

- Verify the bucket name and path are correct
- Check bucket permissions in Supabase Dashboard
- Ensure the file exists in the origin bucket

### Invalid Parameters (400)

- Check parameter types (integers for w, h, q)
- Verify allowed values (fit, format, crop)
- Ensure path doesn't contain `..` or absolute paths

### Transformation Errors (500)

- Check function logs in Supabase Dashboard
- Verify image format is supported (JPEG, PNG, png)
- Ensure image isn't corrupted
- Check if image size exceeds memory limits

### Cache Not Working

- Verify `CACHE_BUCKET` environment variable
- Check cache bucket exists and is writable
- Review function logs for upload errors
- Use `no_cache=1` to bypass cache for testing

## 🗺️ Roadmap

Future enhancements to consider:

- [ ] **Automatic format selection** based on `Accept` header
- [ ] **Smart crop** using face/object detection
- [ ] **Image optimization** (automatic quality adjustment)
- [ ] **Watermarking** support
- [ ] **Blur/sharpen filters**
- [ ] **Rotation** and **flip** transformations
- [ ] **Animated GIF/png** support
- [ ] **AVIF format** support
- [ ] **Metrics and analytics** (transformation counts, cache hit rates)
- [ ] **Cache invalidation** API
- [ ] **Batch processing** API

## 📄 License

MIT License - feel free to use this in your projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com/)
- Image processing by [ImageScript](https://github.com/matmen/ImageScript)
- Inspired by [Cloudinary](https://cloudinary.com/)
