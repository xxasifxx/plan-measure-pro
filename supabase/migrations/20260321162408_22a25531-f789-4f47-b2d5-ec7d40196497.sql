-- Allow authenticated users to upload to project-pdfs bucket
CREATE POLICY "Users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-pdfs');

-- Allow authenticated users to read PDFs they have access to
CREATE POLICY "Users can read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-pdfs');

-- Allow users to delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Same for specs bucket
CREATE POLICY "Users can upload specs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'specs-pdfs');

CREATE POLICY "Users can read specs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'specs-pdfs');