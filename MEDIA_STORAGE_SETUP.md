# 📸 Media Storage Setup Guide

Complete guide for setting up **Supabase Storage** and **Cloudinary** for photos & media in your Cliick.io platform.

---

## 🎯 **What You Have Now:**

### ✅ **Ready to Use:**
1. **[`services/supabaseStorageService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/supabaseStorageService.ts)** - Complete Supabase Storage service
2. **[`services/cloudinaryService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/cloudinaryService.ts)** - Complete Cloudinary service
3. **[`services/mediaService.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/services/mediaService.ts)** - Unified interface (auto-detects provider)
4. **Environment variables** - Added to [`.env.local`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/.env.local)
5. **Supabase client** - Already configured in [`supabase/client.ts`](file:///c:/cliick.io-(backend-ready)-(nov-18_-2_30pm)/supabase/client.ts)

---

## 🗄️ **Option 1: Supabase Storage (Recommended for Beginners)**

### **✅ Pros:**
- Already have Supabase configured
- Free tier: 1GB storage
- Built-in database integration
- No external dependencies

### **❌ Cons:**
- No automatic image transformations
- No CDN optimization
- Manual URL generation

---

### **Setup Steps:**

#### **1. Create Supabase Project** (if not already done)

1. Go to: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New project"**
3. Fill in:
   - Name: `cliick-io`
   - Database Password: (strong password)
   - Region: Choose nearest
4. Wait ~2 minutes

#### **2. Get API Credentials**

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key

#### **3. Add to `.env.local`**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...your_key_here
```

#### **4. Create Storage Buckets**

1. Go to **Storage** in Supabase dashboard
2. Click **"Create bucket"**
3. Create these buckets (one by one):

| Bucket Name | Public? | Purpose |
|-------------|---------|---------|
| `avatars` | ✅ Yes | User profile pictures |
| `products` | ✅ Yes | Product images |
| `chat-attachments` | ✅ Yes | Chat images/files |
| `shop-logos` | ✅ Yes | Shop branding |
| `receipts` | ❌ No | Receipt images (private) |
| `forms` | ❌ No | Form attachments (private) |

**For each bucket:**
- Name: (e.g., `avatars`)
- Public: Check "Public bucket" for public buckets
- Click **"Create bucket"**

#### **5. Set Bucket Policies** (Important!)

For **public buckets** (avatars, products, chat-attachments, shop-logos):

1. Click bucket → **Policies** tab
2. Click **"New policy"**
3. **For SELECT (Read):**
   ```sql
   -- Allow public read access
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'avatars' );
   ```

4. **For INSERT (Upload):**
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated Upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'avatars' AND
     auth.role() = 'authenticated'
   );
   ```

5. **For DELETE:**
   ```sql
   -- Allow users to delete their own files
   CREATE POLICY "User Delete Own"
   ON storage.objects FOR DELETE
   USING (
     bucket_id = 'avatars' AND
     auth.uid() = owner
   );
   ```

**Repeat for each public bucket!**

#### **6. Test Upload**

```typescript
import { mediaService } from './services/mediaService';

// Upload avatar
const file = document.querySelector('input[type="file"]').files[0];
const result = await mediaService.uploadAvatar(file, 'user-123');

console.log('Uploaded:', result.publicUrl);
```

---

## 📸 **Option 2: Cloudinary (Recommended for Production)**

### **✅ Pros:**
- Automatic image optimization
- On-the-fly transformations
- Global CDN
- Free tier: 25GB storage, 25GB bandwidth

### **❌ Cons:**
- Requires external account
- Slightly more complex setup

---

### **Setup Steps:**

#### **1. Create Cloudinary Account**

1. Go to: [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up (free plan)
3. Verify email

#### **2. Get Credentials**

1. Go to **Dashboard**
2. Copy:
   - **Cloud Name** (e.g., `dab123xyz`)
   - **API Key** (e.g., `123456789012345`)

#### **3. Create Upload Preset**

1. Go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Click **"Add upload preset"**
4. Configure:
   - **Preset name:** `cliick-uploads`
   - **Signing mode:** **Unsigned** ✅
   - **Folder:** Leave empty (optional)
   - **Auto-tagging:** Enable if desired
5. Click **"Save"**
6. Copy the **preset name**

#### **4. Add to `.env.local`**

```env
VITE_CLOUDINARY_CLOUD_NAME=dab123xyz
VITE_CLOUDINARY_UPLOAD_PRESET=cliick-uploads
VITE_CLOUDINARY_API_KEY=123456789012345
```

#### **5. Test Upload**

```typescript
import { mediaService } from './services/mediaService';

// Upload product image
const file = document.querySelector('input[type="file"]').files[0];
const result = await mediaService.uploadProductImage(file, 'shop-123');

console.log('Uploaded:', result.url);
```

---

## 🔄 **Using the Unified Media Service**

The **`mediaService`** automatically detects which provider is configured!

### **Basic Upload:**

```typescript
import { mediaService } from './services/mediaService';

// Upload any file
const result = await mediaService.uploadFile({
    file: myFile,
    folder: 'products',
    onProgress: (progress) => console.log(`${progress}%`),
});

if (result.success) {
    console.log('URL:', result.url);
} else {
    console.error('Error:', result.error);
}
```

### **Upload Avatar:**

```typescript
const result = await mediaService.uploadAvatar(file, userId);
```

### **Upload Product Image:**

```typescript
const result = await mediaService.uploadProductImage(file, shopId);
```

### **Upload Chat Attachment:**

```typescript
const result = await mediaService.uploadChatAttachment(file, conversationId);
```

### **Upload Multiple Files:**

```typescript
const files = Array.from(fileInput.files);
const results = await mediaService.uploadMultiple(files, 'products');
```

### **Delete File:**

```typescript
await mediaService.deleteFile(pathOrPublicId, 'products');
```

### **Get Optimized URL** (Cloudinary only):

```typescript
const optimizedUrl = mediaService.getOptimizedUrl(publicId, {
    width: 400,
    quality: 80,
});
```

### **Get Thumbnail:**

```typescript
const thumbnail = mediaService.getThumbnailUrl(publicId, 200);
```

---

## 🎨 **Advanced Cloudinary Features**

### **Image Transformations:**

```typescript
import { cloudinaryService } from './services/cloudinaryService';

// Upload with transformation
const result = await cloudinaryService.uploadFile({
    file: myImage,
    folder: 'products',
    transformation: {
        width: 800,
        height: 600,
        crop: 'fill',
        quality: 'auto',
        format: 'webp',
    },
});
```

### **Pre-defined Transformations:**

```typescript
// Avatar transformation (200x200, face detection)
const result = await cloudinaryService.uploadFile({
    file: avatarFile,
    transformation: cloudinaryService.transformations.avatar(),
});

// Product card (400x400, fill)
const result = await cloudinaryService.uploadFile({
    file: productImage,
    transformation: cloudinaryService.transformations.productCard(),
});
```

### **Get Responsive Images:**

```typescript
const srcSet = cloudinaryService.getResponsiveSrcSet(publicId);
// Returns: "url 320w, url 640w, url 1024w, ..."

// Use in img tag
<img 
    src={cloudinaryService.getOptimizedUrl(publicId)} 
    srcSet={srcSet}
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Product"
/>
```

---

## 🗄️ **Supabase Storage API**

### **Direct Upload:**

```typescript
import { supabaseStorage, BUCKETS } from './services/supabaseStorageService';

const result = await supabaseStorage.uploadImage({
    file: myImage,
    bucket: BUCKETS.PRODUCTS,
    path: 'shop-123/product-1.jpg',
    maxSizeMB: 5,
});
```

### **Get Public URL:**

```typescript
const url = supabaseStorage.getPublicUrl(BUCKETS.PRODUCTS, 'path/to/file.jpg');
```

### **Create Signed URL** (temporary access):

```typescript
const signedUrl = await supabaseStorage.createSignedUrl(
    BUCKETS.RECEIPTS,
    'private/receipt-123.jpg',
    3600 // 1 hour
);
```

### **List Files:**

```typescript
const { files } = await supabaseStorage.listFiles(
    BUCKETS.PRODUCTS,
    'shop-123',
    { limit: 100 }
);
```

### **Move/Rename File:**

```typescript
await supabaseStorage.moveFile(
    BUCKETS.PRODUCTS,
    'old-path.jpg',
    'new-path.jpg'
);
```

---

## 🔧 **Integration Examples**

### **Example 1: Avatar Upload Component**

```typescript
import { useState } from 'react';
import { mediaService } from './services/mediaService';

function AvatarUpload({ userId }: { userId: string }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState('');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        
        const result = await mediaService.uploadAvatar(file, userId, {
            onProgress: setProgress,
        });

        if (result.success) {
            setAvatarUrl(result.url!);
        } else {
            alert(result.error);
        }

        setUploading(false);
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleUpload} />
            {uploading && <progress value={progress} max={100} />}
            {avatarUrl && <img src={avatarUrl} alt="Avatar" />}
        </div>
    );
}
```

### **Example 2: Product Image Gallery**

```typescript
import { mediaService } from './services/mediaService';

async function uploadProductImages(shopId: string, files: FileList) {
    const fileArray = Array.from(files);
    
    const results = await mediaService.uploadMultiple(
        fileArray,
        `products/${shopId}`
    );

    const urls = results
        .filter(r => r.success)
        .map(r => r.url);

    return urls;
}
```

### **Example 3: Chat Attachment**

```typescript
async function sendImageMessage(conversationId: string, file: File) {
    const result = await mediaService.uploadChatAttachment(file, conversationId);
    
    if (result.success) {
        // Save message with image URL
        await saveMessage({
            conversationId,
            type: 'image',
            attachment: {
                url: result.url,
                type: file.type,
                size: file.size,
            },
        });
    }
}
```

---

## ⚙️ **Which Provider Should You Choose?**

### **Choose Supabase if:**
- ✅ You want simplicity
- ✅ You're already using Supabase for database
- ✅ You don't need image transformations
- ✅ You want everything in one platform

### **Choose Cloudinary if:**
- ✅ You need automatic image optimization
- ✅ You want responsive images
- ✅ You need CDN performance
- ✅ You want on-the-fly transformations

### **Use Both?**
You can! The media service can switch between providers:

```typescript
import { mediaService } from './services/mediaService';

// Use Cloudinary for public product images
mediaService.setProvider('cloudinary');
await mediaService.uploadProductImage(file, shopId);

// Use Supabase for private receipts
mediaService.setProvider('supabase');
await mediaService.uploadFile({ file, bucket: 'receipts' });
```

---

## 🚀 **Quick Start Commands**

```bash
# 1. Add credentials to .env.local (edit the file)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# OR
# VITE_CLOUDINARY_CLOUD_NAME=...
# VITE_CLOUDINARY_UPLOAD_PRESET=...

# 2. Start your app
npm run dev

# 3. Test upload
# The media service will auto-detect your configuration!
```

---

## ✅ **Summary**

You're now **100% ready** for both Supabase Storage AND Cloudinary!

**What you have:**
- ✅ Supabase Storage service (complete)
- ✅ Cloudinary service (complete)
- ✅ Unified media service (auto-detect)
- ✅ Environment variables (configured)
- ✅ Helper functions (avatars, products, chat, logos)
- ✅ Progress tracking
- ✅ Error handling
- ✅ Multiple file uploads
- ✅ Image transformations (Cloudinary)

**Just configure your preferred provider and start uploading!** 📸✨
