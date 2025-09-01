import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

function getOpenAI() {
  const apiKeyRaw = process.env.OPENAI_API_KEY
  if (!apiKeyRaw) return null
  const apiKey = apiKeyRaw.trim().replace(/^["']|["']$/g, '')
  return new OpenAI({ 
    apiKey,
    organization: process.env.OPENAI_ORG_ID || undefined,
    project: process.env.OPENAI_PROJECT_ID || undefined,
  })
}

function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAI()
    const supabase = getSupabaseService()

    const { userInput, contentType, platforms, language = 'german' } = await request.json();

    if (!userInput) {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI not configured' },
        { status: 500 }
      )
    }

    // Create a comprehensive prompt for GPT-4o
    const systemPrompt = `Du bist ein erfahrener Social Media Content Creator und Immobilien-Experte. 
    
    Deine Aufgabe ist es, fesselnde Social Media Inhalte zu erstellen, die:
    - Authentisch und professionell sind
    - Die Zielgruppe ansprechen
    - Engagement fördern
    - Relevante Hashtags enthalten
    - Plattform-spezifisch optimiert sind
    
    Erstelle für jeden Post:
    1. Einen fesselnden Titel (max. 60 Zeichen)
    2. Eine überzeugende Beschreibung (max. 2200 Zeichen für Instagram)
    3. Relevante Hashtags (5-15 Hashtags)
    
    Antworte im folgenden JSON-Format:
    {
      "title": "Fesselnder Titel",
      "description": "Überzeugende Beschreibung mit Call-to-Action",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "platformOptimizations": {
        "instagram": "Instagram-spezifische Anpassungen",
        "facebook": "Facebook-spezifische Anpassungen",
        "linkedin": "LinkedIn-spezifische Anpassungen"
      }
    }`;

    const userPrompt = `Erstelle Social Media Content basierend auf folgendem Input:
    
    User Input: "${userInput}"
    Content Type: ${contentType || 'general'}
    Platforms: ${platforms?.join(', ') || 'all'}
    Language: ${language}
    
    Fokus auf Immobilien, aber auch allgemeine Social Media Best Practices.
    Mache den Content authentisch, professionell und engagement-fördernd.`;

    // Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // Fallback response
      parsedResponse = {
        title: "Fesselnder Immobilien-Content",
        description: "Entdecken Sie außergewöhnliche Immobilien mit unserem Expertenteam. Wir helfen Ihnen dabei, Ihr Traumhaus zu finden. Kontaktieren Sie uns für eine persönliche Beratung! 🏠✨",
        hashtags: ["#immobilien", "#traumhaus", "#makler", "#immobilienexpert", "#wohnen"],
        platformOptimizations: {
          instagram: "Perfekt für Instagram mit visuellen Elementen",
          facebook: "Ideal für Facebook mit detaillierten Informationen",
          linkedin: "Professionell für LinkedIn Business-Netzwerk"
        }
      };
    }

    // Validate and clean the response
    const cleanedResponse = {
      title: parsedResponse.title || "Fesselnder Titel",
      description: parsedResponse.description || "Überzeugende Beschreibung",
      hashtags: Array.isArray(parsedResponse.hashtags) ? parsedResponse.hashtags : ["#immobilien", "#content"],
      platformOptimizations: parsedResponse.platformOptimizations || {}
    };

    // Log the generation for analytics
    if (supabase) {
      try {
        const { error: logError } = await supabase
          .from('content_generations')
          .insert([{
            user_input: userInput,
            generated_content: cleanedResponse,
            content_type: contentType,
            platforms: platforms,
            language: language,
            created_at: new Date().toISOString()
          }]);
      
        if (logError) {
          console.error('Failed to log generation:', logError);
        } else {
          console.log('Content generation logged');
        }
      } catch (logError: any) {
        // Don't fail the request if logging fails
        console.error('Logging error:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      content: cleanedResponse
    });

  } catch (error) {
    console.error('Content generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 