import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoMetadata, transcript } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing video for smart zoom moments...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional video editor specializing in dynamic camera movements and zooming techniques. Analyze the video content and suggest smart zoom moments.

Smart zoom should be used to:
1. Emphasize key points or emotional moments
2. Add visual interest during long talking segments
3. Highlight important reactions or expressions
4. Create professional polish similar to TV productions

Return a JSON array of zoom suggestions:
{
  "zooms": [
    {
      "start": number (seconds),
      "end": number (seconds),
      "type": "zoom_in" | "zoom_out" | "zoom_hold",
      "intensity": number (1.0 to 2.0, where 1.0 is no zoom),
      "reason": string (why zoom here),
      "speed": "slow" | "medium" | "fast"
    }
  ],
  "summary": {
    "total_zooms": number,
    "avg_zoom_duration": number,
    "recommended_style": string
  }
}

Rules:
- Zoom in during emphasis words or emotional peaks
- Zoom out for context or transitions
- Keep zooms smooth (2-4 seconds duration)
- Don't over-zoom (max 1.8x)
- Space out zooms (minimum 10 seconds between)
- Return ONLY valid JSON, no markdown`
          },
          {
            role: 'user',
            content: `Suggest smart zoom moments for this content:\n\nMetadata: ${JSON.stringify(videoMetadata)}\n\nTranscript: ${transcript || 'No transcript available'}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '');
    }
    
    const zoomSuggestions = JSON.parse(content);

    console.log('Smart zoom analysis complete:', zoomSuggestions.summary);

    return new Response(
      JSON.stringify(zoomSuggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-smart-zoom:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
