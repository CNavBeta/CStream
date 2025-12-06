# CStream - Plateforme de Streaming

## Overview
CStream est une plateforme de streaming complète avec système de chat, assistant IA (CAi), gestion d'amis via codes à 5 chiffres, profils personnalisables avec bannières, badges de rôles, et intégration TMDB pour films/séries/animes.

## Architecture

### Frontend (React + Vite)
- **Port**: 5000
- **Technologies**: React 18, TypeScript, Tailwind CSS, Shadcn/ui, Framer Motion
- **État**: Zustand pour l'état global

### Backend (Node.js + Express)
- **Port**: 3001
- **API IA**: Groq API (llama-3.3-70b-versatile)
- **Base de données**: Supabase (PostgreSQL)

## Composants Clés

### Pages
- `/` - Page d'accueil avec contenu TMDB
- `/auth` - Authentification (email/Discord)
- `/profile` - Profil utilisateur avec bannière personnalisable
- `/chat` - Chat avec amis et assistant IA (CAi)
- `/movies`, `/series`, `/anime` - Catalogue média

### Fonctionnalités Récentes
1. **Bannière de profil** - Upload d'image avec fallback data URL si bucket Supabase indisponible
2. **Badges de rôles** - Affichage automatique pour admin/mod/creator
3. **Enregistrement vocal** - Intégré dans le chat pour messages vocaux
4. **Système d'amis** - Codes à 5 chiffres, demandes, acceptation/refus

## Configuration Requise

### Secrets (dans Replit Secrets)
- `GROQ_API_KEY` - Clé API Groq pour l'assistant IA
- `SESSION_SECRET` - Secret de session
- Supabase: `DATABASE_URL`, `PGHOST`, `PGPORT`, etc.

### Base de données (Supabase)
Tables principales:
- `profiles` - Profils utilisateurs (username, avatar_url, friend_code, role)
- `friends` - Relations d'amitié
- `friend_requests` - Demandes d'amis
- `messages` - Messages de chat
- `favorites` - Favoris média

## Notes Techniques

### Type Assertions
Le champ `banner_url` n'existe pas encore dans le schéma Supabase `profiles`. Les mises à jour utilisent `as any` pour contourner le typage TypeScript en attendant une migration.

### Stockage
- Avatars: bucket `avatars` (fallback data URL)
- Bannières: bucket `banners` (fallback data URL)

## Dernières Modifications (5 Décembre 2025)

### Sécurité
- **XSS Fix**: Correction vulnérabilité XSS dans le rendu des blocs de code IA - les labels de langage sont maintenant échappés via `escapeHtml()`
- Remplacement des handlers inline `onclick` par délégation d'événements pour les boutons de copie

### Chat et CAi
- **Historique CAi**: Nouveau dialogue pour voir l'historique des conversations avec titres
- **Bouton de défilement**: Bouton flottant "Nouveaux messages" quand on scroll vers le haut
- **Blocs de code améliorés**: Affichage du langage, bouton copier avec feedback
- Auto-scroll intelligent lors des réponses IA en streaming

### Paramètres
- **Informations de session**: Nouvelle section affichant IP, ville, pays, appareil, navigateur et heure de connexion
- Utilisation de l'API ipapi.co pour la géolocalisation

### Administration
- **Promotion de rôles**: Dialogue de sélection de rôle (admin/modérateur/créateur/membre)
- Correction de la recherche utilisateur par ID/nom
- Correction du double envoi de notifications

### Optimisations
- Système d'amis optimisé avec jointures SQL (suppression des requêtes N+1)
- Ajout de la fonctionnalité bannière personnalisable sur le profil
- Intégration du composant VoiceRecorder dans le chat
- Affichage du badge de rôle sous le nom d'utilisateur

### Chat - Layout CSS (Session récente)
- **Hauteur fixe**: Chat utilise `h-screen` avec `overflow-hidden` pour isoler le scroll interne
- **Flex layout**: Structure `flex flex-col` avec `min-h-0` et `flex-shrink-0` pour empêcher la croissance de page
- **ScrollArea**: Zone de messages avec scroll interne, la page ne grandit plus

### Système d'amis amélioré
- **Page AddFriend**: Support des liens directs (`/add-friend/:profileId`) ET recherche par code (`/add-friend?code=12345`)
- **Flux de demandes**: Création de demande d'ami au lieu d'amitié directe
- **Lien de partage**: Bouton pour copier le lien d'ajout d'ami avec code
- **Gestion des erreurs FK**: Acceptation d'amis avec meilleure gestion des contraintes de clés étrangères

### Voice Recorder
- **receiver_id corrigé**: Utilise `selectedFriend.friend_profile.id` au lieu de `friend_id`
- **Type de message**: Envoi avec `message_type: 'voice'` et métadonnées de durée
