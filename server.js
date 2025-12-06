import express from "express";
import Groq from "groq-sdk";

const app = express();
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const CSTREAM_KNOWLEDGE = `
## À propos de CStream
CStream est une plateforme de streaming moderne créée par CDZ. Version actuelle: v0.3 beta.

## Pages et Navigation
- **Accueil (/)** : Page d'accueil avec hero, tendances et recommandations TMDB
- **Films (/movies)** : Catalogue de films avec filtres (genre, année, note, tri)
- **Séries (/tv)** : Catalogue de séries TV avec filtres avancés
- **Anime (/anime)** : Catalogue d'animes avec filtres
- **Acteurs (/actors)** : Liste des acteurs populaires
- **Tendances (/trending)** : Contenu tendance du moment
- **Chat (/chat)** : Messagerie avec amis et assistant IA (CAi)
- **Profil (/profile)** : Profil utilisateur avec avatar, bannière, favoris, historique
- **Paramètres (/settings)** : Paramètres du compte, informations de session

## Fonctionnalités
1. **Système de favoris** : Ajouter films/séries/animes aux favoris
2. **Watchlist** : Liste "À regarder plus tard"
3. **Historique** : Suivi de progression de visionnage
4. **Système d'amis** : 
   - Codes ami à 5 chiffres (ex: 18512)
   - Demandes d'ami
   - Chat en temps réel
5. **Profil personnalisable** :
   - Avatar personnalisé
   - Bannière de profil
   - Badges de rôle (admin, modérateur, créateur)
6. **Messages vocaux** : Enregistrement et envoi dans le chat
7. **Mode sombre** : Thème par défaut avec couleurs violet/rose
8. **Multi-langues** : 10 langues supportées

## Recherche et Filtres
- Recherche multi-média (films, séries, personnes)
- Filtrage par genre, année (1900-2024), note minimale (0-10)
- Tri par popularité, note moyenne, date de sortie

## Technologies
- Frontend: React 18, TypeScript, Tailwind CSS, Shadcn/ui
- Animations: Framer Motion
- API: TMDB (The Movie Database)
- Base de données: Supabase (PostgreSQL)
- Auth: Email/Password, Discord OAuth

## Administration
- Gestion des utilisateurs et rôles
- Import groupé d'épisodes
- Notifications push vers l'app
- Webhooks Discord
`;

const SYSTEM_PROMPT = `Tu es CAi, l'assistant IA officiel de CStream, créé par CDZ.
Tu es amical, intelligent et passionné par le cinéma, les séries et les animes.

${CSTREAM_KNOWLEDGE}

## Tes capacités
Tu peux:
- Recommander des films, séries et animes selon les goûts de l'utilisateur
- Expliquer comment utiliser les fonctionnalités de CStream
- Discuter des intrigues, personnages et thèmes
- Donner des avis et critiques argumentés
- Répondre aux questions sur l'industrie du divertissement
- Aider à naviguer sur le site (indiquer les pages, fonctionnalités)
- Discuter de culture pop et tendances
- Effectuer des recherches web pour des informations à jour

## Règles de réponse
- Réponds toujours en français (sauf si l'utilisateur parle une autre langue)
- Sois concis mais informatif
- Utilise des emojis avec modération 🎬
- Si on te demande qui t'a créé, réponds "CDZ, le créateur de CStream"
- Tu peux formater tes réponses en Markdown (gras, italique, listes, code)
- Sois enthousiaste mais professionnel
- Si l'utilisateur demande comment faire quelque chose sur CStream, guide-le avec les pages appropriées
- Pour les recherches d'actualité ou infos récentes, utilise les outils de recherche disponibles`;

async function searchGoogle(query) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  if (!apiKey || !cx) {
    console.log('Google Search API not configured');
    return null;
  }
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}&num=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      }));
    }
    return null;
  } catch (error) {
    console.error('Google Search error:', error);
    return null;
  }
}

function detectSearchIntent(message) {
  const searchPatterns = [
    /cherche/i, /recherche/i, /trouve/i, /qu'est-ce que/i, /c'est quoi/i,
    /actualit/i, /news/i, /récent/i, /nouveau/i, /sorti/i, /sortie/i,
    /2024/i, /2025/i, /aujourd'hui/i, /cette semaine/i, /ce mois/i,
    /dernier/i, /dernière/i, /derniers/i, /dernières/i
  ];
  
  return searchPatterns.some(pattern => pattern.test(message));
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages requis" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "API key non configurée" });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    let searchResults = null;
    
    if (lastUserMessage && detectSearchIntent(lastUserMessage.content)) {
      searchResults = await searchGoogle(lastUserMessage.content);
    }

    let systemContent = SYSTEM_PROMPT;
    if (searchResults) {
      systemContent += `\n\n## Résultats de recherche web récents pour "${lastUserMessage.content}":\n`;
      searchResults.forEach((result, i) => {
        systemContent += `${i + 1}. **${result.title}**\n   ${result.snippet}\n   Source: ${result.link}\n\n`;
      });
      systemContent += `\nUtilise ces informations pour répondre de manière précise et à jour.`;
    }

    const chatMessages = [
      { role: "system", content: systemContent },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const model = "llama-3.3-70b-versatile";

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      try {
        const completion = await groq.chat.completions.create({
          messages: chatMessages,
          model,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamError) {
        console.error("Stream error:", streamError);
        res.write(
          `data: ${JSON.stringify({ error: "Erreur de streaming" })}\n\n`,
        );
        res.end();
      }
    } else {
      const completion = await groq.chat.completions.create({
        messages: chatMessages,
        model,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content =
        completion.choices[0]?.message?.content ||
        "Désolé, je n'ai pas pu générer une réponse.";
      res.json({ content });
    }
  } catch (error) {
    console.error("Groq API error:", error);

    if (error.status === 401) {
      res.status(401).json({ error: "Clé API invalide" });
    } else if (error.status === 429) {
      res
        .status(429)
        .json({ error: "Trop de requêtes, veuillez réessayer plus tard" });
    } else {
      res.status(500).json({ error: error.message || "Erreur serveur" });
    }
  }
});

app.get("/api/search/google", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }
  
  const results = await searchGoogle(query);
  if (results) {
    res.json({ results });
  } else {
    res.status(500).json({ error: "Search failed or not configured" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    groq: !!process.env.GROQ_API_KEY,
    googleSearch: !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX),
    model: "llama-3.3-70b-versatile",
    timestamp: new Date().toISOString(),
  });
});

const port = process.env.API_PORT || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log("------------------------------------------");
  console.log(`🚀 API Server running on http://0.0.0.0:${port}`);
  console.log(
    `🔑 Groq API Key: ${process.env.GROQ_API_KEY ? "Configured" : "NOT CONFIGURED"}`,
  );
  console.log(
    `🔍 Google Search: ${process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX ? "Configured" : "NOT CONFIGURED"}`,
  );
  console.log(`🤖 Model in use: llama-3.3-70b-versatile`);
  console.log("------------------------------------------");
});
