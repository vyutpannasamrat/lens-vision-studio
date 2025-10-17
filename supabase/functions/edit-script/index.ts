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
    const { currentScript, editPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional script editor. The user will provide you with a current script and instructions on how to modify it. Follow their instructions carefully while maintaining the script's overall quality and flow. Keep the same general structure unless asked to change it. Return only the edited script without any explanations or meta-commentary.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Current script:\n\n${currentScript}\n\n---\n\nEdit instructions: ${editPrompt}\n\nPlease provide the edited version of the script.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      let userMessage = "Failed to edit script. Please try again.";
      
      if (response.status === 429) {
        userMessage = "Rate limit exceeded. Please try again later.";
      } else if (response.status === 402) {
        userMessage = "AI credits exhausted. Please add credits to continue.";
      } else if (response.status === 401) {
        userMessage = "Service temporarily unavailable.";
      } else if (response.status >= 500) {
        userMessage = "Service is experiencing issues. Please try again.";
      }
      
      return new Response(
        JSON.stringify({ error: userMessage }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    const editedScript = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ script: editedScript }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edit script error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
