import OpenAI from 'openai';

// Initialize OpenAI client lazily
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    // Validate API key exists
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not defined. Please set OPENAI_API_KEY in your environment variables.');
    }

    // Initialize OpenAI client
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Enable browser usage with appropriate security measures
    });
  }
  return openai;
}

/**
 * Generates an embedding for the given text using OpenAI's text-embedding-3-small model
 * @param text - The text to generate an embedding for
 * @returns Promise<number[] | null> - The embedding vector or null if generation fails
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      console.error('Invalid input: text cannot be empty');
      return null;
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured. Skipping embedding generation.');
      return null;
    }

    // Get OpenAI client (this will validate the API key)
    const client = getOpenAIClient();

    // Create embedding using OpenAI API
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    // Extract the embedding vector from the response
    const embedding = response.data[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      console.error('No valid embedding data received from OpenAI');
      return null;
    }

    return embedding;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      console.error('Error generating embedding:', error.message);
    } else {
      console.error('Unknown error generating embedding:', error);
    }
    return null;
  }
} 