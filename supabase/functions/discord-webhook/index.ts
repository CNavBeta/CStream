import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1444693081768333354/UecFSmKvgdwNSLJQf6TQeOy_3WxpmpFJ4-aIrZ9e4tt0I-Cjc6qnCnoW9CXuT2eolxVW";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    console.log(`Discord webhook called with type: ${type}`, data);

    let embed;

    switch (type) {
      case 'new_user':
        embed = {
          title: "🎉 Nouvel utilisateur inscrit!",
          description: `**Email:** ${data.email}\n**Username:** ${data.username || 'Non défini'}`,
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
          footer: {
            text: "AniTracker - Système de notification"
          }
        };
        break;
      case 'user_login':
        embed = {
          title: "🔐 Connexion utilisateur",
          description: `**Email:** ${data.email}`,
          color: 0x3498db,
          timestamp: new Date().toISOString(),
          footer: {
            text: "AniTracker - Système de notification"
          }
        };
        break;
      case 'anime_added':
        embed = {
          title: "📺 Anime ajouté à la liste",
          description: `**Utilisateur:** ${data.username}\n**Anime:** ${data.animeName}\n**Status:** ${data.status}`,
          color: 0x9b59b6,
          timestamp: new Date().toISOString(),
          footer: {
            text: "AniTracker - Système de notification"
          }
        };
        break;
      case 'source_added':
        embed = {
          title: "🔗 Nouvelle source ajoutée",
          description: `**Nom:** ${data.name}\n**URL:** ${data.url}\n**Type:** ${data.type}`,
          color: 0xe67e22,
          timestamp: new Date().toISOString(),
          footer: {
            text: "AniTracker - Admin Panel"
          }
        };
        break;
      default:
        embed = {
          title: "📢 Notification",
          description: JSON.stringify(data),
          color: 0x95a5a6,
          timestamp: new Date().toISOString()
        };
    }

    const response = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log('Discord notification sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending Discord notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
