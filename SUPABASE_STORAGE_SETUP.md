# Supabase Storage Setup for Media Files

## 1. Create Storage Bucket

To enable file uploads, you need to create a storage bucket in your Supabase project:

### Steps:
1. **Go to your Supabase project dashboard**
2. **Navigate to Storage section**
3. **Click "Create a new bucket"**
4. **Bucket Configuration:**
   - **Name:** `media-files`
   - **Public:** ✅ (checked)
   - **File size limit:** `100MB` (or as needed)
   - **Allowed MIME types:** Leave empty for all types

## 2. Storage Policies

After creating the bucket, set up the following policies:

### Go to Storage → Policies and create these policies:

#### Policy 1: Allow authenticated users to upload files
```sql
-- Policy Name: Allow authenticated users to upload
-- Operation: INSERT
-- Target roles: authenticated

(bucket_id = 'media-files'::text) AND (auth.role() = 'authenticated'::text)
```

#### Policy 2: Allow users to read their own files
```sql
-- Policy Name: Allow users to read their own files  
-- Operation: SELECT
-- Target roles: authenticated, anon

(bucket_id = 'media-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text OR auth.role() = 'anon'::text)
```

#### Policy 3: Allow users to update their own files
```sql
-- Policy Name: Allow users to update their own files
-- Operation: UPDATE
-- Target roles: authenticated

(bucket_id = 'media-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

#### Policy 4: Allow users to delete their own files
```sql
-- Policy Name: Allow users to delete their own files
-- Operation: DELETE
-- Target roles: authenticated

(bucket_id = 'media-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

## 3. Quick Setup via SQL

Alternatively, you can run this SQL in your Supabase SQL Editor:

```sql
-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media-files', 'media-files', true, 104857600, null)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'media-files');

CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'media-files');

CREATE POLICY "Allow users to update own files" ON storage.objects FOR UPDATE 
TO authenticated 
USING ((storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow users to delete own files" ON storage.objects FOR DELETE 
TO authenticated 
USING ((storage.foldername(name))[1] = auth.uid()::text);
```

## 4. Verify Setup

After setting up the storage bucket and policies, test the upload functionality:

1. **Start your development server:**
   ```bash
   pnpm run dev
   ```

2. **Navigate to the Video Merger or Editor page**

3. **Try uploading a video/image file**

4. **Check that:**
   - File uploads successfully
   - File appears in Supabase Storage → media-files bucket
   - Database record is created in `media_files` table
   - File is available for selection in the UI

## 5. File Organization

Files are organized in the bucket using this structure:
```
media-files/
├── {user-id}/
│   ├── videos/
│   │   └── timestamp-randomid.mp4
│   ├── images/
│   │   └── timestamp-randomid.jpg
│   └── audios/
│       └── timestamp-randomid.mp3
```

This ensures each user's files are isolated and organized by type.

## Troubleshooting

### Common Issues:

1. **"Access Denied" errors**
   - Check that storage policies are correctly set up
   - Verify user is authenticated
   - Ensure bucket is public if files need public access

2. **"Bucket does not exist" errors**
   - Verify the bucket name is exactly `media-files`
   - Check bucket was created successfully

3. **File size errors**
   - Check bucket file size limits
   - Verify files are under 100MB limit

4. **Database insertion errors**
   - Verify `media_files` table exists
   - Check that user has proper permissions
   - Review table schema matches the API expectations