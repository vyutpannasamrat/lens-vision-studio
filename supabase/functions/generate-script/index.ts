import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, contentType, duration, tone } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional script writer for video content creators. Generate engaging, natural-sounding scripts that are perfect for teleprompter reading. 

Content Type: ${contentType || 'general'}
Duration: ${duration || '2-3 minutes'}
Tone: ${tone || 'conversational'}

Format the script with clear paragraphs and natural pauses. Make it sound conversational and engaging.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      // Map to generic user-friendly messages
      let userMessage = "Failed to generate script. Please try again.";
      
      if (response.status === 429) {
        userMessage = "Rate limit exceeded. Please try again later.";
      } else if (response.status === 401) {
        userMessage = "Service temporarily unavailable.";
      } else if (response.status >= 500) {
        userMessage = "External service error. Please try again later.";
      }
      
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedScript = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ script: generatedScript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
