const DISCORD_WEBHOOK_URL = localStorage.getItem('discord_webhook_url') || '';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  author?: { name: string; icon_url?: string };
}

interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export const sendDiscordWebhook = async (
  webhookUrl: string,
  message: DiscordMessage
): Promise<boolean> => {
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
};

export const notifyUserLogin = async (
  webhookUrl: string,
  username: string,
  email: string
) => {
  const message: DiscordMessage = {
    username: 'CStream Bot',
    avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
    embeds: [
      {
        title: '🔐 Nouvelle connexion',
        description: `Un utilisateur vient de se connecter sur CStream`,
        color: 0x8B5CF6,
        fields: [
          { name: '👤 Utilisateur', value: username || 'Non défini', inline: true },
          { name: '📧 Email', value: email || 'Non défini', inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'CStream v0.2 beta' },
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, message);
};

export const notifyUserRegistration = async (
  webhookUrl: string,
  username: string,
  email: string
) => {
  const message: DiscordMessage = {
    username: 'CStream Bot',
    avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
    embeds: [
      {
        title: '🎉 Nouvel utilisateur inscrit !',
        description: `Un nouveau membre a rejoint CStream`,
        color: 0x22C55E,
        fields: [
          { name: '👤 Nom d\'utilisateur', value: username || 'Non défini', inline: true },
          { name: '📧 Email', value: email || 'Non défini', inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'CStream v0.2 beta' },
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, message);
};

export const sendAdminMessage = async (
  webhookUrl: string,
  message: string,
  adminName: string
) => {
  const discordMessage: DiscordMessage = {
    username: 'CStream Admin',
    avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png',
    embeds: [
      {
        title: '📢 Message de l\'administrateur',
        description: message,
        color: 0xEC4899,
        author: { name: adminName },
        timestamp: new Date().toISOString(),
        footer: { text: 'CStream Administration' },
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, discordMessage);
};

export const notifyNewContent = async (
  webhookUrl: string,
  contentTitle: string,
  contentType: 'movie' | 'tv' | 'anime',
  posterUrl?: string
) => {
  const typeLabels = {
    movie: '🎬 Nouveau film',
    tv: '📺 Nouvelle série',
    anime: '🎌 Nouvel anime',
  };

  const message: DiscordMessage = {
    username: 'CStream Bot',
    avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
    embeds: [
      {
        title: typeLabels[contentType],
        description: `**${contentTitle}** est maintenant disponible sur CStream !`,
        color: 0x8B5CF6,
        thumbnail: posterUrl ? { url: posterUrl } : undefined,
        timestamp: new Date().toISOString(),
        footer: { text: 'CStream v0.2 beta' },
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, message);
};

export const validateWebhookUrl = (url: string): boolean => {
  const discordWebhookRegex = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
  return discordWebhookRegex.test(url);
};

export const saveWebhookUrl = (url: string): void => {
  localStorage.setItem('discord_webhook_url', url);
};

export const getWebhookUrl = (): string => {
  return localStorage.getItem('discord_webhook_url') || '';
};
