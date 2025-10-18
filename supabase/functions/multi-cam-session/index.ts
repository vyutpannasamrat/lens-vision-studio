import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case 'create': {
        // Generate unique 6-character session code
        const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data: session, error } = await supabase
          .from('recording_sessions')
          .insert({
            session_code: sessionCode,
            user_id: user.id,
            connection_type: body.connection_type || 'internet',
            metadata: body.metadata || {}
          })
          .select()
          .single();

        if (error) throw error;

        // Create master device entry
        const { data: device, error: deviceError } = await supabase
          .from('session_devices')
          .insert({
            session_id: session.id,
            device_id: body.device_id,
            device_name: body.device_name || 'Master Device',
            user_id: user.id,
            role: 'master',
            capabilities: body.capabilities || {}
          })
          .select()
          .single();

        if (deviceError) throw deviceError;

        // Update session with master_device_id
        await supabase
          .from('recording_sessions')
          .update({ master_device_id: device.id })
          .eq('id', session.id);

        return new Response(
          JSON.stringify({ session, device }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'join': {
        const { session_code, device_id, device_name, angle_name } = body;

        // Find session
        const { data: session, error: sessionError } = await supabase
          .from('recording_sessions')
          .select('*')
          .eq('session_code', session_code)
          .single();

        if (sessionError || !session) {
          throw new Error('Invalid session code');
        }

        if (session.status !== 'waiting' && session.status !== 'ready') {
          throw new Error('Session is not accepting new devices');
        }

        // Add device to session
        const { data: device, error: deviceError } = await supabase
          .from('session_devices')
          .insert({
            session_id: session.id,
            device_id,
            device_name,
            user_id: user.id,
            role: 'camera',
            angle_name: angle_name || 'Camera',
            capabilities: body.capabilities || {}
          })
          .select()
          .single();

        if (deviceError) throw deviceError;

        return new Response(
          JSON.stringify({ session, device }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'leave': {
        const { device_id, session_id } = body;

        const { error } = await supabase
          .from('session_devices')
          .update({ status: 'disconnected' })
          .eq('device_id', device_id)
          .eq('session_id', session_id)
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        const { session_id } = body;

        const { data: session, error: sessionError } = await supabase
          .from('recording_sessions')
          .select('*, session_devices(*)')
          .eq('id', session_id)
          .single();

        if (sessionError) throw sessionError;

        return new Response(
          JSON.stringify(session),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        const { session_id, status } = body;

        const { data, error } = await supabase
          .from('recording_sessions')
          .update({ 
            status,
            ...(status === 'recording' && { started_at: new Date().toISOString() }),
            ...(status === 'stopped' && { ended_at: new Date().toISOString() })
          })
          .eq('id', session_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'heartbeat': {
        const { device_id, session_id } = body;

        const { error } = await supabase
          .from('session_devices')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('device_id', device_id)
          .eq('session_id', session_id)
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in multi-cam-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});