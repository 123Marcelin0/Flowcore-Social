-- Create content_generations table for logging AI-generated content
CREATE TABLE IF NOT EXISTS content_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_input TEXT NOT NULL,
  generated_content JSONB NOT NULL,
  content_type VARCHAR(50),
  platforms TEXT[],
  language VARCHAR(10) DEFAULT 'german',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_generations_created_at ON content_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_content_generations_content_type ON content_generations(content_type);
CREATE INDEX IF NOT EXISTS idx_content_generations_language ON content_generations(language);

-- Add RLS policies
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own content generations
CREATE POLICY "Users can insert their own content generations" ON content_generations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own content generations
CREATE POLICY "Users can view their own content generations" ON content_generations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow users to update their own content generations
CREATE POLICY "Users can update their own content generations" ON content_generations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow users to delete their own content generations
CREATE POLICY "Users can delete their own content generations" ON content_generations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_generations_updated_at 
  BEFORE UPDATE ON content_generations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE content_generations IS 'Stores AI-generated content for analytics and improvement';
COMMENT ON COLUMN content_generations.user_input IS 'The original user input that triggered content generation';
COMMENT ON COLUMN content_generations.generated_content IS 'The AI-generated content in JSON format';
COMMENT ON COLUMN content_generations.content_type IS 'Type of content being generated (e.g., post, story, reel)';
COMMENT ON COLUMN content_generations.platforms IS 'Target platforms for the generated content';
COMMENT ON COLUMN content_generations.language IS 'Language of the generated content'; 