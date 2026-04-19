# 🏥 Curalink Medical AI

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Architecture](#️-architecture)
- [End-to-End Message Flow](#-end-to-end-message-flow)
- [Research Pipeline](#-research-pipeline)
- [Ranking System](#-ranking-system)
- [AI & LLM Integration](#-ai--llm-integration)
- [Context Management](#-context-management)
- [Location Intelligence](#-location-intelligence)
- [Security](#-security)
- [Setup & Installation](#️-setup--installation)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Performance](#-performance)
- [System Capabilities](#-system-capabilities)
- [Disclaimer](#️-disclaimer)

---

## 🌟 Overview

Curalink is a full-stack medical research platform built on the **MERN stack**, powered by **LLaMA 3.1 8B** (open-source) via Groq inference. It transforms natural language medical queries into structured, evidence-ranked research responses by combining:

| Component | Description |
|---|---|
| **Hybrid Search** | PubMed + OpenAlex + ClinicalTrials.gov fetched in parallel (400+ papers per query) |
| **Intent Detection** | 13 query intent types with targeted retrieval strategies per intent |
| **Evidence Hierarchy** | Phase 3 RCTs ranked above meta-analyses, above cohort studies |
| **Location Intelligence** | City/country-aware clinical trial prioritisation with word-boundary matching |
| **Context Awareness** | Multi-turn conversations with automatic disease context switching |
| **Anti-Hallucination** | LLM strictly constrained to cite only the provided papers |

> ⚠️ Curalink is for informational and research purposes only.
> Always consult qualified healthcare professionals for medical decisions.

---

## ✨ Features

### 🔬 Research Intelligence

| Feature | Description |
|---|---|
| Hybrid Search | 400+ papers fetched in parallel from 3 sources |
| 13-Type Intent Detection | Treatment, diagnosis, prognosis, side effects, mechanism, researchers, and more |
| Evidence Hierarchy | Phase 3 RCT (+40pts) > Meta-analysis (+35pts) > Cohort (+28pts) > Retrospective (+8pts) |
| Paper Type Classification | 8 paper types matched to 13 query intents with reward/penalty system |
| Location-First Trials | Word-boundary matching — `"Indiana"` never matches `"India"` |
| Subtype Specificity | NSCLC papers get +20pts over SCLC for "lung cancer" queries |
| Age-Filtered Ranking | Treatment queries filter papers older than 5 years automatically |
| Synonym Validation | "Cirrhotic cardiomyopathy" correctly excluded from heart disease results |

### 💬 Conversation Intelligence

| Feature | Description |
|---|---|
| Topic Switching | Automatic disease context switch with full context reset |
| Drug Follow-ups | "Tell me about osimertinib" → targeted drug + disease search |
| Referent Resolution | "Which one?" → injects previous response drug names into search |
| Lifestyle Query Safety | Word-boundary fix — "treatments" no longer matches "eat" |
| Off-Topic Guard | Greetings and non-medical queries handled gracefully without search |
| Disease Clarification | Asks for disease when context-requiring query has no disease |
| Pending Query Replay | After user provides disease → re-runs original query automatically |
| History Limit Tiers | 0–6 message history tiers to prevent cross-disease contamination |

### 👤 User Features

| Feature | Description |
|---|---|
| Authentication | JWT + OTP email verification + secure password reset |
| PDF Export | Formatted cards with evidence badges, tags, and underlined URLs |
| Text Export | Structured plain text with full publication and trial metadata |
| Conversations | Save, pin, and revisit research sessions |
| Profile | Disease of interest + location preferences used automatically |

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion 11 | Page & component animations |
| Zustand 4 | Lightweight state management |
| React Router 6 | Client-side navigation |
| Axios 1.6 | HTTP client with interceptors |
| jsPDF 2.5 | PDF generation & export |
| Lucide React | Icon library |

### Backend

| Technology | Purpose |
|---|---|
| Node.js 18+ | JavaScript runtime |
| Express 4 | REST API server |
| MongoDB + Mongoose 7 | Primary database |
| Redis (Upstash) | Context caching + response caching |
| JWT | Stateless authentication |
| Nodemailer | OTP & password reset emails |
| xml2js | PubMed XML response parsing |
| bcrypt | Password hashing |

### AI & Research APIs

| Service | Purpose |
|---|---|
| Groq → LLaMA 3.1 8B | Open-source LLM for structured JSON medical responses |
| PubMed E-utilities | Biomedical publications with MeSH term queries |
| OpenAlex API | Open-access research papers with semantic search |
| ClinicalTrials.gov v2 | Clinical trial data with location parameter filtering |

---

## 📁 Project Structure

```
curalink-medical-ai/
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                    # MongoDB Atlas connection
│   │   │   ├── redis.js                 # Upstash Redis client setup
│   │   │   ├── email.js                 # Nodemailer SMTP configuration
│   │   │   └── ollama.js                # Groq LLM client configuration
│   │   │
│   │   ├── models/
│   │   │   ├── User.js                  # User schema (profile, disease, location)
│   │   │   ├── Conversation.js          # Conversation + context schema
│   │   │   ├── Message.js               # Message + full structured response metadata
│   │   │   ├── OTP.js                   # Email OTP verification schema
│   │   │   └── ResetToken.js            # Password reset token schema
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT verification middleware
│   │   │   ├── errorHandler.js          # Global Express error handler
│   │   │   ├── rateLimiter.js           # 100 req / 15 min per IP
│   │   │   ├── validation.js            # express-validator input rules
│   │   │   └── cacheMiddleware.js       # Redis cache for GET routes (30s TTL)
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js                  # /api/v1/auth/*
│   │   │   ├── chat.js                  # /api/v1/chat/*
│   │   │   ├── research.js              # /api/v1/research/*
│   │   │   ├── user.js                  # /api/v1/user/*
│   │   │   └── api.js                   # Root API router
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js        # Register, login, OTP, reset password
│   │   │   ├── chatController.js        # sendMessage — main pipeline orchestrator
│   │   │   └── researchController.js    # Direct research queries
│   │   │
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── llmService.js        # Groq LLM: prompt building + JSON output
│   │   │   │   ├── embeddingService.js  # Reserved for future semantic search
│   │   │   │   └── queryExpansion.js    # Intent detection + query builder (PubMed/OpenAlex)
│   │   │   │
│   │   │   ├── research/
│   │   │   │   ├── pubmedService.js     # PubMed E-utilities: retry + parallel batch fetch
│   │   │   │   ├── openalexService.js   # OpenAlex works API with cache bypass logic
│   │   │   │   ├── clinicalTrialsService.js  # ClinicalTrials.gov v2 + location filter
│   │   │   │   ├── hybridSearchService.js    # Orchestrates all 3 sources in parallel
│   │   │   │   └── rankingService.js    # 10-factor publication + trial evidence ranking
│   │   │   │
│   │   │   ├── context/
│   │   │   │   ├── contextManager.js    # Redis context + MongoDB conversation sync
│   │   │   │   └── entityExtractor.js   # LLM entity extraction from user messages
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── authService.js       # JWT generation, bcrypt password hashing
│   │   │       └── emailService.js      # OTP + reset email HTML templates
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.js                # Winston structured logger
│   │   │   ├── cache.js                 # Redis get/set/del helper wrappers
│   │   │   └── helpers.js               # General utility functions
│   │   │
│   │   └── server.js                    # Express app entry point
│   │
│   ├── package.json
│   └── .env                             # Environment variables (never commit)
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx        # Email + password login form
│   │   │   │   ├── RegisterForm.jsx     # Registration with disease/location
│   │   │   │   ├── OTPVerification.jsx  # 6-digit OTP input + resend
│   │   │   │   ├── ProtectedRoute.jsx   # JWT-guarded route wrapper
│   │   │   │   ├── ForgotPasswordModal.jsx  # Email reset request modal
│   │   │   │   └── ResetPasswordModal.jsx   # New password input modal
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── ChatInterface.jsx    # Main chat layout with message list
│   │   │   │   ├── MessageBubble.jsx    # User + assistant message rendering
│   │   │   │   ├── InputArea.jsx        # Query input with send button
│   │   │   │   ├── TypingIndicator.jsx  # Animated loading dots
│   │   │   │   ├── ConversationSidebar.jsx  # Conversation history list
│   │   │   │   └── ExportButton.jsx     # PDF / text export trigger
│   │   │   │
│   │   │   ├── research/
│   │   │   │   ├── PublicationCard.jsx  # Paper with year/source/journal tags
│   │   │   │   ├── ClinicalTrialCard.jsx  # Trial with status badge + contact
│   │   │   │   ├── StructuredResponse.jsx # Renders all response sections
│   │   │   │   └── SourceAttribution.jsx  # Source snippet with URL
│   │   │   │
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx           # Variant button component
│   │   │   │   ├── Card.jsx             # Shadowed card container
│   │   │   │   ├── Input.jsx            # Floating label input
│   │   │   │   ├── Modal.jsx            # Overlay modal component
│   │   │   │   ├── LoadingSpinner.jsx   # Animated spinner
│   │   │   │   ├── Toast.jsx            # Notification toast
│   │   │   │   ├── Alert.jsx            # Inline alert banner
│   │   │   │   ├── Avatar.jsx           # User avatar initials
│   │   │   │   └── Badge.jsx            # Status/type badge pill
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx           # Top navigation bar
│   │   │   │   ├── Sidebar.jsx          # Collapsible sidebar
│   │   │   │   └── Footer.jsx           # Footer with disclaimer
│   │   │   │
│   │   │   └── animations/
│   │   │       ├── PageTransition.jsx   # Framer Motion page wrapper
│   │   │       ├── FadeIn.jsx           # Fade-in animation
│   │   │       └── SlideIn.jsx          # Slide-in animation
│   │   │
│   │   ├── pages/
│   │   │   ├── Landing.jsx              # Marketing landing page
│   │   │   ├── Auth.jsx                 # Login / Register with mode toggle
│   │   │   ├── Dashboard.jsx            # Main research interface
│   │   │   ├── Chat.jsx                 # Active conversation view
│   │   │   ├── Profile.jsx              # User settings + disease/location
│   │   │   ├── Trending.jsx             # Trending medical research
│   │   │   └── Library.jsx              # Saved research library
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js               # Auth state + actions
│   │   │   ├── useChat.js               # Chat operations + message handling
│   │   │   ├── useResearch.js           # Research query utilities
│   │   │   └── useDebounce.js           # Input debounce hook
│   │   │
│   │   ├── stores/
│   │   │   ├── authStore.js             # Zustand: user + JWT state
│   │   │   ├── chatStore.js             # Zustand: conversations + messages
│   │   │   └── uiStore.js               # Zustand: toast, modal, sidebar state
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                   # Axios instance with interceptors
│   │   │   ├── authService.js           # Auth API calls
│   │   │   ├── chatService.js           # Chat + conversation API calls
│   │   │   └── researchServices.js      # Research query API calls
│   │   │
│   │   └── utils/
│   │       ├── constants.js             # App-wide constants
│   │       ├── helpers.js               # Formatting + utility functions
│   │       ├── cn.js                    # Classnames helper (clsx + twMerge)
│   │       └── exportChat.js            # PDF + text export logic (jsPDF)
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite 5)                        │
│                                                                    │
│   Landing → Auth → Dashboard → Chat → Profile → Library          │
│                                                                    │
│   Zustand: authStore / chatStore / uiStore                        │
│   Axios → REST API → /api/v1/*                                    │
└───────────────────────────┬──────────────────────────────────────┘
                             │  HTTPS / REST
┌───────────────────────────▼──────────────────────────────────────┐
│                   EXPRESS API SERVER (Node.js 18)                  │
│                                                                    │
│   rateLimiter → JWT auth → validation → routes → controllers      │
│                                                                    │
│   chatController.sendMessage()                                     │
│   ├─ isOffTopicQuery()          → polite redirect  (~100ms)       │
│   ├─ requiresDiseaseContext()   → ask user for disease (~200ms)   │
│   ├─ detectNewDisease()         → topic switch detection          │
│   ├─ contextManager.getContext() → Redis context lookup           │
│   ├─ hybridSearchService.search() → parallel 3-source fetch      │
│   ├─ rankingService.rankPublications() → evidence scoring         │
│   ├─ rankingService.rankClinicalTrials() → location scoring       │
│   ├─ llmService.generateMedicalResponse() → JSON output          │
│   └─ Message.create() → MongoDB persistence                       │
└─────────────────────┬────────────────────┬───────────────────────┘
                       │                    │
         ┌─────────────▼──────┐  ┌──────────▼──────────┐
         │   MongoDB Atlas     │  │   Redis (Upstash)   │
         │                     │  │                     │
         │   Users             │  │   Context (30 min)  │
         │   Conversations     │  │   Publications (1hr)│
         │   Messages          │  │   Conv list  (30s)  │
         │   OTPs              │  └─────────────────────┘
         │   ResetTokens       │
         └─────────────────────┘
                       │
         ┌─────────────▼──────────────────────────────────┐
         │              EXTERNAL APIs                       │
         │                                                  │
         │   PubMed E-utilities  →  200 papers (MeSH)      │
         │   OpenAlex API        →  200 papers (NLP)       │
         │   ClinicalTrials.gov  →  location-filtered      │
         │   Groq API            →  LLaMA 3.1 8B output    │
         └──────────────────────────────────────────────────┘
```

---

## 🔄 End-to-End Message Flow

Every user message goes through these steps in sequence:

### Step 1 — Query Classification
```
Input:  "Latest treatments for Lung Cancer"

isOffTopicQuery()      → false  (has medical signal)
isLifestyleQuery()     → false  (word-boundary safe — "treatments" ≠ "eat")
isVagueQuery()         → false  (5 meaningful tokens)
isProcedureQuery()     → false
extractDrugFromQuery() → null
isComparisonQuery()    → false
```

### Step 2 — Off-Topic Guard
```
If isOffTopicQuery() == true:
  → Return polite redirect in ~100ms
  → No PubMed / OpenAlex / Groq calls
  → Saves all API costs

Examples caught:
  "hi"          → greeting (1 token, no medical signal)
  "great movie" → OFF_TOPIC_PATTERNS match
  "Dhurandhar is a great movie" → isGreatPattern + no medical context
```

### Step 3 — Disease Detection
```
detectNewDisease("Latest treatments for Lung Cancer", currentDisease)
→ DISEASE_LIST pattern: "lung cancer" found → "Lung Cancer"

If different from currentDisease AND not comparison query:
  isTopicSwitch = true
  → Redis context cleared (contextManager.clearContext)
  → conversation.context.disease updated in MongoDB
  → historyLimit = 0 (no contamination from old disease)
```

### Step 4 — Context Resolution
```
effectiveDisease  = newDiseaseDetected
                 || conversation.context.disease
                 || context.disease (Redis)
                 || userProfile.diseaseOfInterest
                 || null

effectiveLocation = conversation.context.location  (Priority 1)
                 || context.location (message-extracted) (Priority 2)
                 || userProfile.location (profile)       (Priority 3)
                 || null → global search                 (Priority 4)
```

### Step 5 — Disease Context Gate
```
If !effectiveDisease AND requiresDiseaseContext(query):
  → Save pendingQuery = "Clinical trials near me" to Redis
  → Return: "Which disease are you interested in?"
  → No search performed

Next message: "Lung Cancer"
  → wasAwaitingDisease = true
  → pendingQuery = "Clinical trials near me"
  → searchQuery = "Lung Cancer Clinical trials near me" ✅
  → Normal flow continues
```

### Step 6 — Search Query Building
```
isTopicSwitch  → searchQuery = trimmedContent (fresh)
isLifestyle    → clear stale context, use original query
drugMention    → "Lung Cancer osimertinib efficacy safety outcomes"
hasReferent    → "Lung Cancer pembrolizumab nivolumab which one?"
isVague+entities → "Lung Cancer pembrolizumab nivolumab"
isVague         → "Lung Cancer [last meaningful query]"
default followup → "Lung Cancer [trimmedContent]"
```

### Step 7 — Hybrid Search (Parallel)
```
queryExpansionService.expandQuery(searchQuery, disease, context)
→ detectQueryIntent() → "treatment_solutions"
→ buildPubMedQuery()  → MeSH + treatment filters + date range
→ buildOpenAlexQuery() → semantic natural language query

Promise.all([
  pubmedService.search(pubmedQuery, 200),        // PubMed API
  openalexService.search(openalexQuery, 200),    // OpenAlex API
  clinicalTrialsService.searchWithLocation(      // ClinicalTrials.gov
    disease, "Kolkata, India"
  )
])

Result: 200 + 200 + 79 = 479 items
After deduplication (DOI + title similarity): ~388 unique publications
```

### Step 8 — Publication Ranking
```
For each of 388 papers:
  Hard filter 1: disease or synonym must appear → reject if missing
  Hard filter 2: intent required keywords (title OR abstract)
  Hard filter 3: negative title signals ("study protocol" → reject)
  Disqualifier:  intentDisqualifiers match → ×0.2 penalty
  Paper type:    wrong type for intent → ×0.25 penalty

  Score = sum of 10+ factors (see Ranking System section)

Age filter: treatment_solutions → max 5 years old
Normalise 0-100 → sort → top 20 → diversifyResults → final 8
```

### Step 9 — Trial Ranking
```
_trialIsRelevant() pre-filter:
  → Hard exclusion patterns (lignocaine bronchoscopy → reject)
  → trialDiseaseExclusions (cirrhosis conditions ≠ heart disease)
  → Synonym invalidation

Location scoring:
  India trial (Kolkata user) → +300 pts (country match)
  US trial                   → -300 pts (non-local penalty)
  Net gap: 600 pts → India trials always dominate

Trial type scoring:
  treatment_trial   → +30 bonus
  diagnostic_trial  → ×0.2 penalty for treatment_solutions intent

reorderTrialLocations():
  → Moves India location to front of trial.locations[]
  → User sees "Bangalore, India" not "Los Angeles; Bangalore"

diversifyResults(threshold > 20) → final 8
```

### Step 10 — LLM Response
```
llmService.generateMedicalResponse(
  query, enhancedContext,
  publications[8], trials[8],
  conversationHistory[0-6], userProfile
)

System prompt enforces:
  ✅ "ONLY discuss Lung Cancer"
  ✅ "Key findings MUST cite [1], [2]..."
  ✅ "Return ONLY valid JSON"
  ✅ "NEVER fabricate findings"
  ✅ "Prioritise trials near Kolkata"
  ✅ Previous entities: "PREVIOUS RESPONSE MENTIONED: pembrolizumab"

temperature=0.1, max_tokens=1800
→ Structured JSON output
```

### Step 11 — Post-Processing & Persist
```
removePlaceholders()      → remove "specific finding", "drug/treatment name"
removeCrossDisease()      → remove metformin from lung cancer response
extractResponseEntities() → store ["pembrolizumab", "nivolumab"] for next turn

Message.create({
  role: "assistant",
  metadata: {
    disease, intent, location,       // ← for accurate PDF export
    publications[8],
    clinicalTrials[8],
    structuredResponse: { all fields },
    processingTime, modelUsed
  }
})

contextManager.updateContext() → store responseEntities in Redis
conversation.updateMetadata() → update message counts

→ JSON response to client (~8-15 seconds total)
```

---

## 🔬 Research Pipeline

### Intent Detection (13 Types)

| Intent | Trigger Example | PubMed Strategy |
|---|---|---|
| `treatment_solutions` | "Latest treatments for lung cancer" | `[Title] AND (treatment OR therapy OR efficacy) AND date` |
| `clinical_trials` | "Clinical trials for diabetes" | `AND "clinical trial"[Publication Type]` |
| `researchers` | "Top researchers in Alzheimer's" | `AND review[Title] AND date` |
| `recent_research` | "Recent studies on heart disease" | `AND (2023:2026[PDAT])` |
| `safety_efficacy` | "Can I take Vitamin D?" | `"vitamin d"[Title] AND disease AND safety` |
| `mechanism` | "How does osimertinib work?" | `drug AND disease AND (mechanism OR pathway)` |
| `symptoms_diagnosis` | "Symptoms of Parkinson's" | `AND (diagnosis OR symptom OR biomarker)` |
| `prevention` | "How to prevent diabetes" | `AND (prevention OR prophylaxis)` |
| `prognosis` | "Survival rate for lung cancer" | `AND (prognosis OR survival OR mortality)` |
| `comparison` | "Pembrolizumab vs nivolumab" | `drug AND disease AND (versus OR compared)` |
| `side_effects` | "Side effects of metformin" | `drug AND (adverse OR toxicity OR safety)` |
| `access_cost` | "Cost of osimertinib in India" | `AND (cost OR access OR affordable)` |
| `general` | "Parkinson's disease" | `disease AND recent date range` |

### Smart Cache Bypass

| Query Type | Cache | Reason |
|---|---|---|
| Treatment queries | ❌ Always fresh | Recency critical — 2019 papers must not appear |
| Recent research | ❌ Always fresh | Date-sensitive by definition |
| Supplement/food | ❌ Always fresh | Prevents "spicy food" cache poisoning "vitamin D" |
| Mechanism / general | ✅ 1 hour TTL | Not time-sensitive |
| Conversation list | ✅ 30 sec TTL | High-frequency polling |

---

## 📊 Ranking System

### Publication Scoring Factors

| Factor | Max Points | Description |
|---|---|---|
| Paper type bonus | +25 | `clinical_outcome` preferred for treatment queries |
| Evidence hierarchy | +40 | Phase 3 RCT=40, Meta-analysis=35, Cohort=28, Phase 2=22 |
| Clinical endpoints | +30 | OS / PFS / ORR / Hazard Ratio detected in title |
| Subtype exactness | ±20 | NSCLC=+20, SCLC=-20 for lung cancer queries |
| Positive signals | +20 | "versus", "hazard ratio", "response rate" in title |
| Solution keywords | +50 | Intent-specific keyword matches |
| Disease relevance | +45 | Exact disease phrase in title |
| Synonym bonus | +15 | NSCLC matches lung cancer synonyms |
| Query phrase match | +30 | Exact query phrase in title |
| Query relevance | +25 | Query token hits |
| Publication type | +15 | RCT=15, systematic review=14, meta-analysis=14 |
| Recency | +20 | 2026=20, 2025=18, 2024=15, >5yr=0 (treatment) |
| Source credibility | +15 | PubMed=10, high-impact journal=+5 |
| Citation impact | +15 | 1000+ citations=15, 100+=9 |
| Abstract quality | +5 | Length-based quality signal |
| Author count | +3 | Collaborative research indicator |

**Penalties:**
- Wrong paper type for intent: `×0.25` (e.g., mechanism paper for treatment query)
- Keyword disqualifier match: `×0.20` (e.g., ML prediction paper for treatment)
- Negative abstract signal: `×0.60`

### Trial Scoring Factors

| Factor | Points | Description |
|---|---|---|
| **Exact city match** | **+500** | Trial in user's exact city — dominates all |
| **Country match** | **+300** | Trial in user's country |
| Partial match | +150 | Fuzzy location match |
| Global fallback | +0 | No local trials exist — shown without penalty |
| **Non-local penalty** | **−300** | Foreign trial when local exists |
| Treatment trial bonus | +30 | Correct trial type for treatment intent |
| Diagnostic trial penalty | ×0.2 | Wrong type for treatment query |
| RECRUITING status | +40 | Active recruitment |
| COMPLETED (treatment) | +50 | Completed + treatment intent boost |
| Phase 4/3/2/1 | 20/18/14/10 | Higher phase = stronger evidence |
| Enrollment size | up to +12 | Larger trials rank higher |
| Contact available | +5/+8 | Email and/or phone present |
| Multi-site | up to +8 | International scope |
| Recency | up to +10 | Recent start date |

---

## 🤖 AI & LLM Integration

### Model: LLaMA 3.1 8B via Groq

```
Why LLaMA 3.1 8B:
  ✅ Fully open-source (Meta AI)
  ✅ Can be run locally via Ollama
  ✅ Fast inference via Groq
  ✅ Sufficient for structured JSON medical output
  ✅ Low temperature → deterministic, factual responses

Configuration:
  temperature: 0.1    ← deterministic output
  max_tokens:  1800   ← prevents JSON truncation
  top_p:       0.9
```

### System Prompt Design

```
Layer 1 — Disease Lock:
  "ONLY discuss [disease]. No other diseases."

Layer 2 — Citation Requirement:
  "Every key finding MUST cite [1], [2]... from provided papers"

Layer 3 — JSON-Only:
  "Return ONLY valid JSON. No markdown. No text outside JSON."

Layer 4 — Anti-Hallucination:
  "NEVER fabricate findings not present in the papers"

Layer 5 — Location Awareness:
  "Prioritise trials near Kolkata, India in clinicalTrialsSummary"
  OR "No local trials found near Kolkata. Showing global trials."

Layer 6 — Referent Resolution:
  "PREVIOUS RESPONSE MENTIONED: pembrolizumab, nivolumab
   (If user asks 'which one', these are the likely referents)"

Layer 7 — Lifestyle Query Honesty:
  "If papers don't address [spicy food], say so honestly.
   Do NOT fabricate connections."

Layer 8 — Researcher Mode:
  "FORMAT keyFindings as: Dr. LastName (Institution): contribution [1]"
```

### LLM Output Schema

```json
{
  "conditionOverview":     "2-3 factual sentences about disease + query",
  "keyFindings": [
    "Specific finding with real data [1]",
    "Another finding [2]"
  ],
  "researchInsights":      "Analysis of research trends from provided papers",
  "clinicalTrialsSummary": "Single plain string — never an array",
  "recommendations": [
    "Evidence-based recommendation from research"
  ],
  "safetyConsiderations": [
    "Safety note specific to this disease context"
  ],
  "sourceSnippets": [{
    "title":    "exact paper title from provided list",
    "authors":  "Author1, Author2",
    "year":     2026,
    "platform": "PUBMED",
    "url":      "https://pubmed.ncbi.nlm.nih.gov/...",
    "snippet":  "direct quote from abstract (max 120 chars)"
  }]
}
```

---

## 🧠 Context Management

### Redis Context Structure

```
Key: context:{userId}:{conversationId}
TTL: 1800 seconds (30 minutes)

Value:
{
  disease:          "Lung Cancer",
  location:         "Kolkata, India",
  entities: {
    diseases:   ["Lung Cancer"],
    treatments: ["pembrolizumab", "nivolumab"],
    symptoms:   [],
    medications:[],
    procedures: []
  },
  previousQueries:  [...last 10 queries],
  responseEntities: ["pembrolizumab", "nivolumab"],  ← next-turn referents
  pendingQuery:     null,                             ← pending after clarification
  awaitingDisease:  false,
  lastUpdated:      "2026-04-19T..."
}
```

### Conversation History Limits

| Scenario | Limit | Reason |
|---|---|---|
| Topic switch | **0** | Complete fresh start — zero contamination |
| Supplement/lifestyle | **0** | Prevent disease drug names bleeding in |
| Referent ("which one?") | **6** | Needs deep history to resolve references |
| Vague query | **4** | Needs context to answer meaningfully |
| Procedure query | **2** | Specific topic needs light context |
| Follow-up | **2** | Light context to stay on track |
| First message | **4** | Initial onboarding context |

### History Sanitization

Assistant messages fed back to LLM use `conditionOverview` (max 300 chars)
instead of raw LLM JSON output. This prevents:
- JSON blobs contaminating context
- Drug names from previous diseases bleeding in
- Long outputs exceeding context window

---

## 📍 Location Intelligence

### Resolution Priority Chain

```
Priority 1: conversation.context.location   ← set at creation or topic switch
Priority 2: context.location (Redis)         ← extracted from message ("trials in Mumbai")
Priority 3: userProfile.location (MongoDB)  ← from profile settings page
Priority 4: null                             ← global search, no location scoring
```

### Word-Boundary City/Country Matching

```javascript
// Regex approach prevents false positives:
\bindia\b   → matches "India" but NOT "Indiana, United States"
\bkolkata\b → matches "Kolkata" but NOT embedded occurrences

// Flow for "Kolkata, India":
userCity    = "kolkata"
userCountry = "india" (via cityToCountry map)

// ClinicalTrials.gov query:
query.locn = "India"  → fetches all India trials

// rankingService._tagTrialLocation():
"Asarwa, Ahmedabad, India" → \bindia\b matches → priority 2 (+300)
"Kolkata, West Bengal"     → \bkolkata\b matches → priority 3 (+500)
"Indianapolis, Indiana, US"→ \bindia\b = false! → non-local (-300)
```

### Trial Location Reordering

```javascript
// reorderTrialLocations() moves local site to front:
BEFORE: ["Los Angeles, CA", "Bangalore, India", "Chicago, IL"]
AFTER:  ["Bangalore, India", "Los Angeles, CA", "Chicago, IL"]

// User in Kolkata sees "Bangalore, India" first ✅
// Not "Los Angeles, CA" (which was first in raw API data)
```

### No-Location Fallback

```
Local trials ≥ 5  → return local only (100% India trials)
Local trials < 5  → merge local + global (marked matchSource='global_fallback')
                    global fallback trials get +0 (no penalty, no bonus)
No location set   → pure global search, no location scoring applied
```

---

## 🔐 Security

| Layer | Implementation | Details |
|---|---|---|
| Password Storage | bcrypt | 10 salt rounds |
| Authentication | JWT | httpOnly cookie, 7 day expiry, secure flag in production |
| Email Verification | OTP | 6-digit code, 10 min expiry, 5 attempt limit |
| Password Reset | Token | Cryptographically random, 1 hour expiry, single-use |
| Rate Limiting | express-rate-limit | 100 requests / 15 min per IP |
| Input Validation | express-validator | All endpoints, server-side |
| NoSQL Injection | Mongoose | Schema validation + type casting |
| XSS Prevention | Input sanitization | All user inputs sanitized |
| CORS | Configured | CLIENT_URL only — no wildcard |

---

## ⚙️ Setup & Installation

### Prerequisites

| Requirement | Where to Get |
|---|---|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) (free tier) |
| Redis (Upstash) | [upstash.com](https://upstash.com) (free tier) |
| Groq API Key | [console.groq.com](https://console.groq.com) (free) |
| PubMed API Key | [ncbi.nlm.nih.gov/account](https://www.ncbi.nlm.nih.gov/account/) (free) |
| Gmail App Password | Google Account → Security → App Passwords |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/curalink-medical-ai.git
cd curalink-medical-ai

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install

# 4. Configure environment variables
cd ../server
cp .env.example .env
# → Edit .env with your credentials (see Environment Variables section)

# 5. Start development servers

# Terminal 1 — Backend (http://localhost:5001)
cd server
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client
npm run dev
```

### Production Build

```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
NODE_ENV=production npm start
```

---

## 🔑 Environment Variables

Create `server/.env` with the following:

```env
# ────────────────────────────────────────────────────────────────────
# SERVER
# ────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5173

# ────────────────────────────────────────────────────────────────────
# DATABASE
# ────────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/curalink?appName=Cluster0

# ────────────────────────────────────────────────────────────────────
# REDIS (Upstash)
# ────────────────────────────────────────────────────────────────────
REDIS_URL=rediss://default:password@host.upstash.io:6379

# ────────────────────────────────────────────────────────────────────
# AUTHENTICATION
# Generate secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# ────────────────────────────────────────────────────────────────────
JWT_SECRET=your-64-char-random-secret-here
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# ────────────────────────────────────────────────────────────────────
# EMAIL (Gmail — requires App Password with 2FA enabled)
# Google Account → Security → 2-Step Verification → App Passwords
# ────────────────────────────────────────────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=Curalink Medical AI <noreply@curalink.ai>

# ────────────────────────────────────────────────────────────────────
# OTP CONFIGURATION
# ────────────────────────────────────────────────────────────────────
OTP_EXPIRE_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5

# ────────────────────────────────────────────────────────────────────
# GROQ AI (LLaMA 3.1 8B — Open Source)
# Get key at: https://console.groq.com (free)
# ────────────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_TIMEOUT=180000

# ────────────────────────────────────────────────────────────────────
# RESEARCH APIs
# ────────────────────────────────────────────────────────────────────
PUBMED_BASE_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils

# Get free API key: https://www.ncbi.nlm.nih.gov/account/
# Without key: 3 req/s | With key: 10 req/s (prevents timeouts)
PUBMED_API_KEY=your_key_here
PUBMED_SEARCH_TIMEOUT=25000
PUBMED_FETCH_TIMEOUT=30000

OPENALEX_BASE_URL=https://api.openalex.org
CLINICAL_TRIALS_BASE_URL=https://clinicaltrials.gov/api/v2

# ────────────────────────────────────────────────────────────────────
# SEARCH CONFIGURATION
# ────────────────────────────────────────────────────────────────────
INITIAL_FETCH_SIZE=200
FINAL_RESULTS_SIZE=8
MIN_PUBLICATION_YEAR=2015

# ────────────────────────────────────────────────────────────────────
# CACHE TTL (seconds)
# ────────────────────────────────────────────────────────────────────
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=3600

# ────────────────────────────────────────────────────────────────────
# RATE LIMITING
# ────────────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📡 API Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | ❌ | Register + send OTP email |
| `POST` | `/api/v1/auth/verify-otp` | ❌ | Verify 6-digit email OTP |
| `POST` | `/api/v1/auth/login` | ❌ | Login → set JWT cookie |
| `POST` | `/api/v1/auth/logout` | ✅ | Clear JWT cookie |
| `POST` | `/api/v1/auth/forgot-password` | ❌ | Send password reset email |
| `PUT` | `/api/v1/auth/reset-password/:token` | ❌ | Reset with token |
| `GET` | `/api/v1/auth/me` | ✅ | Get current user profile |
| `PUT` | `/api/v1/auth/update-profile` | ✅ | Update name/location/disease |

### Chat Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/chat/conversations` | ✅ | Create new conversation |
| `GET` | `/api/v1/chat/conversations` | ✅ | List user conversations |
| `GET` | `/api/v1/chat/conversations/:id` | ✅ | Get conversation + messages |
| `POST` | `/api/v1/chat/conversations/:id/messages` | ✅ | **Send message (main endpoint)** |
| `DELETE` | `/api/v1/chat/conversations/:id` | ✅ | Soft-delete conversation |

### Send Message — Request

```json
POST /api/v1/chat/conversations/:id/messages
Content-Type: application/json
Cookie: jwt=<token>

{
  "content": "Latest treatments for Lung Cancer"
}
```

### Send Message — Response

```json
{
  "success": true,
  "data": {
    "userMessage": {
      "_id": "...",
      "role": "user",
      "content": "Latest treatments for Lung Cancer"
    },
    "assistantMessage": {
      "_id": "...",
      "role": "assistant",
      "content": "<raw LLM text>",
      "metadata": {
        "disease":        "Lung Cancer",
        "intent":         "treatment_solutions",
        "location":       "Kolkata, India",
        "publications":   [{ "title": "...", "relevanceScore": 0.95, "year": 2026 }],
        "clinicalTrials": [{ "title": "...", "isLocal": true, "status": "RECRUITING" }],
        "structuredResponse": {
          "conditionOverview":     "...",
          "keyFindings":           ["Finding [1]", "Finding [2]"],
          "researchInsights":      "...",
          "clinicalTrialsSummary": "...",
          "recommendations":       ["..."],
          "safetyConsiderations":  ["..."],
          "sourceSnippets":        [{ "title": "...", "url": "...", "snippet": "..." }],
          "references": {
            "publicationCount": 8,
            "trialCount": 8
          }
        },
        "processingTime": 9500,
        "modelUsed":      "llama3.1:8b",
        "searchStrategy": "hybrid"
      }
    },
    "processingTime": 9500
  },
  "meta": {
    "hasLocation":          true,
    "locationSource":       "profile",
    "effectiveLocation":    "Kolkata, India",
    "locationPrompt":       null,
    "awaitingDisease":      false,
    "usingProfileLocation": true
  }
}
```

### Special Response Cases

```json
// Off-topic query ("hi", "great movie", etc.)
{
  "meta": { "awaitingDisease": false },
  "data": {
    "assistantMessage": {
      "metadata": { "intent": "off_topic" },
      "content": "I'm Curalink, a medical research assistant..."
    }
  }
}

// Disease clarification needed ("clinical trials near me" with no disease)
{
  "meta": { "awaitingDisease": true },
  "data": {
    "assistantMessage": {
      "metadata": { "intent": "clarification_needed" },
      "content": "Which disease are you interested in?..."
    }
  }
}
```

---

## ⚡ Performance

| Metric | Value | Notes |
|---|---|---|
| First query response | 8–15 seconds | Full parallel search + LLM |
| Follow-up response | 3–8 seconds | Partial cache hits |
| Off-topic guard | ~100ms | No external API calls |
| Clarification request | ~200ms | No search or LLM |
| Supplement query | 8–12 seconds | Cache bypass, fresh search |
| PubMed fetch (200 papers) | 8–15 seconds | 3 concurrent batches of 50 |
| OpenAlex fetch (200 papers) | 3–5 seconds | Single paginated request |
| LLM generation | 4–8 seconds | 1800 tokens structured JSON |

### Optimisations Applied

| Optimisation | Effect |
|---|---|
| Parallel source fetch | PubMed + OpenAlex + ClinicalTrials simultaneously |
| Concurrent PubMed batches | 200 IDs split across 3 parallel batch requests |
| Smart cache bypass | Treatment queries skip cache → always fresh 2026 papers |
| Pre-filtering before scoring | Trials pre-filtered → faster ranking loop |
| Context stale clearing | `_pubmedQuery` deleted before each search → no stale results |
| Off-topic early return | Greetings return in ~100ms, no API calls |
| Diversification pool | Top 20 → diversify → 8 (better than top 8 → diversify → 8) |

---

## 🎯 System Capabilities

| Capability | Status |
|---|---|
| Multi-disease topic switching | ✅ Full |
| Supplement & lifestyle queries | ✅ Full |
| Procedure queries (DBS, dialysis) | ✅ Full |
| Drug-specific follow-ups | ✅ Full |
| Referent resolution ("which one?") | ✅ Full |
| Off-topic query guard | ✅ Full |
| Disease clarification + pending query replay | ✅ Full |
| Location-aware trials (India ≠ Indiana) | ✅ Full |
| Global fallback when no local trials | ✅ Full |
| Age-filtered ranking (treatment max 5yr) | ✅ Full |
| Evidence hierarchy scoring | ✅ Full |
| Paper type semantic classification | ✅ Full |
| Synonym invalidation (cirrhosis ≠ heart disease) | ✅ Full |
| Cross-disease contamination removal | ✅ Full |
| PDF export with accurate disease/location | ✅ Full |
| Text export with full metadata | ✅ Full |
| Statistical significance parsing | 🔄 Future |
| Cross-paper contradiction detection | 🔄 Future |
| Full semantic vector search | 🔄 Future |

---

## ⚠️ Disclaimer

Curalink is for **informational and research purposes only**.

It is **not** a substitute for professional medical advice, diagnosis, or treatment. Research results are sourced from public databases (PubMed, OpenAlex, ClinicalTrials.gov) and ranked algorithmically. The accuracy of AI-generated summaries should always be verified against the original source papers.

**Always consult qualified healthcare professionals before making any medical decisions.**

---

## 📄 License

No License. Made with ❤️ by Sayan.



