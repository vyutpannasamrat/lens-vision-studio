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
    const { sessionId, angles } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing angles for best selection...', { sessionId, angleCount: angles.length });

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
            content: `You are a professional video editor specializing in multi-camera productions. Analyze the provided camera angles and create an optimal cut sequence.

Consider:
1. Video quality (resolution, stability, lighting)
2. Speaker visibility and engagement (face visibility, eye contact)
3. Audio quality
4. Framing and composition
5. Angle variety for dynamic editing

Return a JSON array of cut decisions with timestamps:
{
  "cuts": [
    {
      "timestamp": number (seconds),
      "angle": string (angle name),
      "reason": string (why this angle is best),
      "duration": number (suggested duration in seconds)
    }
  ],
  "summary": {
    "primary_angle": string,
    "total_cuts": number,
    "avg_cut_duration": number
  }
}

Rules:
- Start with the best overall angle
- Switch angles every 5-15 seconds for dynamic feel
- Avoid rapid cuts (minimum 3 seconds per angle)
- Use wide shots for context, close-ups for emotion
- Return ONLY valid JSON, no markdown`
          },
          {
            role: 'user',
            content: `Analyze these camera angles and suggest optimal cuts:\n\n${JSON.stringify(angles)}`
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
    
    const analysis = JSON.parse(content);

    console.log('Best angles analysis complete:', analysis.summary);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-best-angles:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
