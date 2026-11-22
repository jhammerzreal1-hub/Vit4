/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { loadWalletState } from './cryptoWalletService';
import { internalSecretsHandler } from './internalSecretsHandler';

const DATA_DIR = path.join(process.cwd(), 'data');
const GRANTS_STORE_FILE = path.join(DATA_DIR, 'sovereign_grant_applications.json');

export type GrantCategory =
  | 'CRYPTO_AGENTIC_NON_DILUTIVE'
  | 'OPENSOURCE_PUBLIC_GOODS'
  | 'FEDERAL_RESEARCH_GRANTS'
  | 'CLOUD_COMPUTE_CREDITS'
  | 'MICRO_GRANTS_FOUNDATIONS';

export interface NonReciprocalGrantOpportunity {
  id: string;
  title: string;
  sponsor: string;
  category: GrantCategory;
  awardRange: string;
  payoutMedium: 'CRYPTO_USDC_ETH_SOL' | 'USD_FIAT_GRANT' | 'CLOUD_COMPUTE_CREDITS';
  nonReciprocalTerms: string; // e.g. "0% Equity · Non-Repayable · Non-Dilutive Grant"
  approvalType: 'ELIGIBILITY_BASED' | 'MERIT_REVIEW' | 'RETROACTIVE_BUILDERS' | 'FEDERAL_COMPETITIVE';
  deadline: string;
  eligibilitySummary: string;
  applicationUrl: string;
  source: 'VERIFIED_CURATED' | 'GRANTS_GOV_LIVE_API' | 'GEMINI_LIVE_WEB_SEARCH';
  discoveredAt: string;
  matchScore: number; // 0-100 fit for Lysander Sovereign OS / AI Agent project
}

export interface GrantApplicantProfile {
  applicantName: string;
  organizationName: string;
  email: string;
  website: string;
  githubUrl: string;
  zenodoDoi: string;
  orcid: string;
  projectTitle: string;
  projectSummary: string;
  requestedUseOfFunds: string;
}

export interface GeneratedGrantApplication {
  id: string;
  grantId: string;
  grantTitle: string;
  sponsor: string;
  applicationUrl: string;
  awardRange: string;
  payoutMedium: string;
  status: 'DRAFT_READY' | 'REVIEWED' | 'SUBMITTED' | 'AWARDED';
  createdAt: string;
  updatedAt: string;
  modelUsed: string;
  receivingWalletAddresses: {
    ethereumEip55: string;
    bitcoinSegwit: string;
    solanaBase58: string;
  };
  markdownPacket: string;
  groundingSources: Array<{ title: string; uri: string }>;
}

interface PersistedGrantsState {
  profile: GrantApplicantProfile;
  opportunities: NonReciprocalGrantOpportunity[];
  applications: GeneratedGrantApplication[];
  lastAutonomousScanAt: string;
  lastScanSummary: string;
  autoScanEnabled: boolean;
}

const DEFAULT_APPLICANT_PROFILE: GrantApplicantProfile = {
  applicantName: 'Joshua Lee Hamilton (JHammerZ)',
  organizationName: 'Lysander Sovereign OS / Genesis Node Open-Source Initiative',
  email: 'jhammerzreal1@gmail.com',
  website: 'https://jhammerz.github.io',
  githubUrl: 'https://github.com/JHammerZ/jhammerz.github.io',
  zenodoDoi: 'https://doi.org/10.5281/zenodo.20778079',
  orcid: 'https://orcid.org/0009-0004-5273-7028',
  projectTitle: 'Lysander Sovereign OS: Open-Source Autonomous Multi-Agent Operating System & Self-Custody Agentic Runtime',
  projectSummary:
    'An open-source, cross-platform AI-native operating system featuring multi-agent orchestration, real self-custody cryptographic keystores (secp256k1/Ed25519/AES-256-GCM), live conformal macro telemetry, universal cross-OS binary/container compatibility, and verifiable H-FID cryptographic provenance.',
  requestedUseOfFunds:
    'Open-source engineering, mainnet security auditing, decentralized RPC & GPU inference infrastructure, and autonomous on-chain public-goods tooling.'
};

const VERIFIED_NON_RECIPROCAL_GRANTS: Omit<NonReciprocalGrantOpportunity, 'discoveredAt'>[] = [
  {
    id: 'grant-nlnet-ngi0-commons',
    title: 'NLnet Foundation — NGI0 Commons Fund (Open-Source Software & Sovereign Infrastructure)',
    sponsor: 'NLnet Foundation (European Commission NGI)',
    category: 'OPENSOURCE_PUBLIC_GOODS',
    awardRange: '€5,000 – €50,000+ EUR (Direct Non-Repayable Grant)',
    payoutMedium: 'USD_FIAT_GRANT',
    nonReciprocalTerms: '0% Equity · Non-Repayable · 100% Non-Reciprocal Open-Source Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Bi-Monthly Deadlines (Open Continuously)',
    eligibilitySummary: 'Open globally to individuals and independent open-source developers building free/open-source internet, OS, privacy, or cryptographic infrastructure.',
    applicationUrl: 'https://nlnet.nl/commonsfund/',
    source: 'VERIFIED_CURATED',
    matchScore: 98
  },
  {
    id: 'grant-cdp-builder-grants',
    title: 'Coinbase Developer Platform (CDP) AgentKit & Builder Grants',
    sponsor: 'Coinbase Developer Platform',
    category: 'CRYPTO_AGENTIC_NON_DILUTIVE',
    awardRange: '$3,000 – $30,000 Pool (Direct Crypto + Cloud/Gas Credits)',
    payoutMedium: 'CRYPTO_USDC_ETH_SOL',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Non-Dilutive Builder Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Recurring Quarterly Cohorts & Hackathon Tracks',
    eligibilitySummary: 'Builders integrating autonomous AI agents, Agentic Wallets, x402 payments, or Base on-chain apps.',
    applicationUrl: 'https://docs.cdp.coinbase.com/',
    source: 'VERIFIED_CURATED',
    matchScore: 99
  },
  {
    id: 'grant-solana-foundation-ai',
    title: 'Solana Foundation AI & Open-Source Public Goods Grants',
    sponsor: 'Solana Foundation',
    category: 'CRYPTO_AGENTIC_NON_DILUTIVE',
    awardRange: '$5,000 – $50,000+ USDC / SOL (Milestone-Based)',
    payoutMedium: 'CRYPTO_USDC_ETH_SOL',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Non-Dilutive Foundation Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Applications (Open Year-Round)',
    eligibilitySummary: 'Open worldwide to developers building open-source AI agent tooling, autonomous wallets, or public goods on Solana.',
    applicationUrl: 'https://solana.org/grants-funding',
    source: 'VERIFIED_CURATED',
    matchScore: 97
  },
  {
    id: 'grant-base-builder-grants',
    title: 'Base Builder Grants & Retroactive Onchain Rounds',
    sponsor: 'Base (Coinbase Layer 2)',
    category: 'CRYPTO_AGENTIC_NON_DILUTIVE',
    awardRange: '1 – 5 ETH (Direct Mainnet Base ETH / USDC)',
    payoutMedium: 'CRYPTO_USDC_ETH_SOL',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Direct Self-Custody Payout',
    approvalType: 'RETROACTIVE_BUILDERS',
    deadline: 'Rolling / Weekly Builder Rounds',
    eligibilitySummary: 'Shipped open-source apps, AI agents, or developer infrastructure live on Base.',
    applicationUrl: 'https://www.base.org/builders',
    source: 'VERIFIED_CURATED',
    matchScore: 95
  },
  {
    id: 'grant-ethereum-esp',
    title: 'Ethereum Foundation Ecosystem Support Program (ESP)',
    sponsor: 'Ethereum Foundation',
    category: 'CRYPTO_AGENTIC_NON_DILUTIVE',
    awardRange: '$10,000 – $100,000+ USD / ETH',
    payoutMedium: 'CRYPTO_USDC_ETH_SOL',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Pure Public Goods Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Applications (Small Grants & Project Grants)',
    eligibilitySummary: 'Open-source developer tools, cryptographic research, client/wallet security, and public infrastructure benefiting Ethereum.',
    applicationUrl: 'https://esp.ethereum.foundation/',
    source: 'VERIFIED_CURATED',
    matchScore: 94
  },
  {
    id: 'grant-opensats-bitcoin',
    title: 'OpenSats General & Bitcoin Core / Nostr Open-Source Grants',
    sponsor: 'OpenSats (501(c)(3) Public Charity)',
    category: 'CRYPTO_AGENTIC_NON_DILUTIVE',
    awardRange: '$5,000 – $100,000+ (Paid in BTC or USD)',
    payoutMedium: 'CRYPTO_USDC_ETH_SOL',
    nonReciprocalTerms: '0% Equity · Non-Repayable · 501(c)(3) Charitable Open-Source Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Applications',
    eligibilitySummary: 'Free and open-source software (MIT/Apache/GPL) supporting Bitcoin self-custody, privacy, and freedom tech.',
    applicationUrl: 'https://opensats.org/apply/grant',
    source: 'VERIFIED_CURATED',
    matchScore: 93
  },
  {
    id: 'grant-sovereign-tech-fund',
    title: 'Sovereign Tech Agency (Sovereign Tech Fund)',
    sponsor: 'German Federal Ministry (SPRIND / Sovereign Tech Agency)',
    category: 'OPENSOURCE_PUBLIC_GOODS',
    awardRange: '€50,000 – €350,000+ EUR',
    payoutMedium: 'USD_FIAT_GRANT',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Public Digital Infrastructure Funding',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Submissions',
    eligibilitySummary: 'Open globally to maintainers strengthening critical open-source software, OS security, and foundational developer tools.',
    applicationUrl: 'https://www.sovereign.tech/programs/fund',
    source: 'VERIFIED_CURATED',
    matchScore: 91
  },
  {
    id: 'grant-emergent-ventures',
    title: 'Emergent Ventures (Mercatus Center Micro-Grants & Fellowships)',
    sponsor: 'Mercatus Center at George Mason University',
    category: 'MICRO_GRANTS_FOUNDATIONS',
    awardRange: '$1,000 – $50,000 USD (Fast Turnaround)',
    payoutMedium: 'USD_FIAT_GRANT',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Zero-Strings Moonshot Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Applications',
    eligibilitySummary: 'High-ambition independent builders, researchers, and technologists working on breakthrough software or AI systems.',
    applicationUrl: 'https://www.mercatus.org/emergent-ventures',
    source: 'VERIFIED_CURATED',
    matchScore: 92
  },
  {
    id: 'grant-1517-medici',
    title: '1517 Fund — Medici Project Non-Dilutive Micro-Grants',
    sponsor: '1517 Fund',
    category: 'MICRO_GRANTS_FOUNDATIONS',
    awardRange: '$1,000 USD (Non-Dilutive Starter Grant)',
    payoutMedium: 'USD_FIAT_GRANT',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Starter Builder Grant',
    approvalType: 'MERIT_REVIEW',
    deadline: 'Rolling Applications',
    eligibilitySummary: 'Independent makers, hackers, and founders building early working prototypes outside traditional institutions.',
    applicationUrl: 'https://www.1517fund.com/medici-project',
    source: 'VERIFIED_CURATED',
    matchScore: 89
  },
  {
    id: 'grant-ms-founders-hub',
    title: 'Microsoft for Startups Founders Hub (Eligibility-Based AI & Cloud Credits)',
    sponsor: 'Microsoft',
    category: 'CLOUD_COMPUTE_CREDITS',
    awardRange: '$1,000 – $150,000 in Azure / OpenAI / GitHub Enterprise Credits',
    payoutMedium: 'CLOUD_COMPUTE_CREDITS',
    nonReciprocalTerms: '0% Equity · Non-Repayable · No Investor Required for Entry Tier',
    approvalType: 'ELIGIBILITY_BASED',
    deadline: 'Open Continuously (Instant Eligibility Verification)',
    eligibilitySummary: 'High-approval eligibility-based startup/indie software builder program requiring a real software product and LinkedIn/business verification—zero equity taken.',
    applicationUrl: 'https://www.microsoft.com/en-us/startups',
    source: 'VERIFIED_CURATED',
    matchScore: 96
  },
  {
    id: 'grant-google-cloud-startups',
    title: 'Google Cloud for Startups — AI & Web3 Non-Dilutive Credit Track',
    sponsor: 'Google Cloud',
    category: 'CLOUD_COMPUTE_CREDITS',
    awardRange: '$2,000 (Start Tier) up to $200,000 – $350,000 (AI / Web3 Funded Tier)',
    payoutMedium: 'CLOUD_COMPUTE_CREDITS',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Direct Cloud & AI Compute Credits',
    approvalType: 'ELIGIBILITY_BASED',
    deadline: 'Open Continuously',
    eligibilitySummary: 'Entry Start Tier ($2,000 credits) is open to bootstrapped AI/Web3 builders with a live web app & domain; higher tiers available for grant/funded projects.',
    applicationUrl: 'https://cloud.google.com/startup',
    source: 'VERIFIED_CURATED',
    matchScore: 97
  },
  {
    id: 'grant-aws-activate-founders',
    title: 'AWS Activate Founders (Bootstrapped Builder Credits)',
    sponsor: 'Amazon Web Services',
    category: 'CLOUD_COMPUTE_CREDITS',
    awardRange: '$1,000 USD AWS Credits (No VC Required)',
    payoutMedium: 'CLOUD_COMPUTE_CREDITS',
    nonReciprocalTerms: '0% Equity · Non-Repayable · Bootstrapped Eligibility Program',
    approvalType: 'ELIGIBILITY_BASED',
    deadline: 'Open Continuously',
    eligibilitySummary: 'Self-funded software builders with a live product website and AWS account qualify for $1,000 non-dilutive infrastructure credits.',
    applicationUrl: 'https://aws.amazon.com/activate/activate-landing/',
    source: 'VERIFIED_CURATED',
    matchScore: 95
  }
];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (
    internalSecretsHandler.getSecret('GEMINI_API_KEY') ||
    internalSecretsHandler.getSecret('ALL_KEY') ||
    process.env.GEMINI_API_KEY ||
    ''
  ).trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function parseGeminiUpstreamError(err: any): {
  httpStatus: number;
  message: string;
  isQuotaExhausted: boolean;
} {
  const raw = String(err?.message || err || '');
  const upper = raw.toUpperCase();
  if (upper.includes('429') || upper.includes('RESOURCE_EXHAUSTED') || upper.includes('QUOTA')) {
    return {
      httpStatus: 429,
      isQuotaExhausted: true,
      message:
        'Gemini API quota is currently exhausted (429 RESOURCE_EXHAUSTED) for this key. Open Settings > Secrets to select a billing-enabled GEMINI_API_KEY for full AI grant drafting, or click "Provenance Sheet" on any grant to generate a structured non-AI cover sheet with your real mainnet payout addresses immediately.'
    };
  }
  if (upper.includes('403') || upper.includes('PERMISSION_DENIED') || upper.includes('ACCESS_DENIED')) {
    return {
      httpStatus: 403,
      isQuotaExhausted: false,
      message:
        'Gemini API access was denied (403 PERMISSION_DENIED). Open Settings > Secrets to configure a valid GEMINI_API_KEY.'
    };
  }
  if (upper.includes('400') || upper.includes('API_KEY_INVALID') || upper.includes('INVALID ARGUMENT')) {
    return {
      httpStatus: 400,
      isQuotaExhausted: false,
      message:
        'Configured GEMINI_API_KEY is invalid. Open Settings > Secrets to select a valid GEMINI_API_KEY.'
    };
  }
  return {
    httpStatus: 502,
    isQuotaExhausted: false,
    message: `Gemini API request failed: ${raw.slice(0, 180) || 'Upstream service error.'}`
  };
}

let cachedGrantsState: PersistedGrantsState | null = null;

function saveGrantsState(state: PersistedGrantsState) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${GRANTS_STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, GRANTS_STORE_FILE);
}

export function loadGrantsState(): PersistedGrantsState {
  if (cachedGrantsState) return cachedGrantsState;

  const now = new Date().toISOString();
  try {
    if (fs.existsSync(GRANTS_STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(GRANTS_STORE_FILE, 'utf8')) as PersistedGrantsState;
      if (parsed && Array.isArray(parsed.opportunities) && Array.isArray(parsed.applications)) {
        cachedGrantsState = {
          profile: { ...DEFAULT_APPLICANT_PROFILE, ...(parsed.profile || {}) },
          opportunities: parsed.opportunities,
          applications: parsed.applications,
          lastAutonomousScanAt: parsed.lastAutonomousScanAt || now,
          lastScanSummary: parsed.lastScanSummary || 'Loaded persisted non-reciprocal grant registry.',
          autoScanEnabled: parsed.autoScanEnabled !== false
        };
        return cachedGrantsState;
      }
    }
  } catch {}

  cachedGrantsState = {
    profile: { ...DEFAULT_APPLICANT_PROFILE },
    opportunities: VERIFIED_NON_RECIPROCAL_GRANTS.map((g) => ({ ...g, discoveredAt: now })),
    applications: [],
    lastAutonomousScanAt: now,
    lastScanSummary: 'Initialized with 12 verified 0%-equity non-reciprocal grant & credit programs. Ready for live Grants.gov + Google Search Grounding discovery.',
    autoScanEnabled: true
  };
  saveGrantsState(cachedGrantsState);
  return cachedGrantsState;
}

export function updateGrantApplicantProfile(patch: Partial<GrantApplicantProfile>): GrantApplicantProfile {
  const state = loadGrantsState();
  state.profile = { ...state.profile, ...patch };
  saveGrantsState(state);
  return state.profile;
}

export function updateGrantApplicationStatus(
  applicationId: string,
  status: GeneratedGrantApplication['status']
): GeneratedGrantApplication | null {
  const state = loadGrantsState();
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return null;
  app.status = status;
  app.updatedAt = new Date().toISOString();
  saveGrantsState(state);
  return app;
}

async function fetchLiveGrantsGovOpportunities(queryKeyword: string): Promise<NonReciprocalGrantOpportunity[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: queryKeyword || 'artificial intelligence open source software',
        oppStatuses: 'posted|forecasted',
        rows: 8
      }),
      signal: controller.signal
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    const hits: any[] = json?.data?.oppHits || json?.oppHits || [];
    const now = new Date().toISOString();
    return hits.slice(0, 6).map((h: any) => {
      const oppId = String(h.id || h.number || crypto.randomBytes(4).toString('hex'));
      const title = String(h.title || 'Federal Non-Reciprocal Grant Opportunity');
      const agency = String(h.agencyName || h.agency || 'U.S. Federal Agency');
      const closeDate = h.closeDate ? String(h.closeDate) : 'Open / Rolling';
      return {
        id: `grants-gov-${oppId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        title,
        sponsor: agency,
        category: 'FEDERAL_RESEARCH_GRANTS' as const,
        awardRange: h.awardCeiling ? `Up to $${Number(h.awardCeiling).toLocaleString()} USD` : 'Federal Grant Award (See NOFO)',
        payoutMedium: 'USD_FIAT_GRANT' as const,
        nonReciprocalTerms: '0% Equity · Non-Repayable Federal Grant (Grants.gov Official Listing)',
        approvalType: 'FEDERAL_COMPETITIVE' as const,
        deadline: closeDate,
        eligibilitySummary: `Official Grants.gov Opportunity #${h.number || oppId}. Requires SAM.gov registration & federal proposal submission.`,
        applicationUrl: `https://www.grants.gov/search-results-detail/${oppId}`,
        source: 'GRANTS_GOV_LIVE_API' as const,
        discoveredAt: now,
        matchScore: 86
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function discoverViaGeminiLiveSearch(focusQuery?: string): Promise<{
  grants: NonReciprocalGrantOpportunity[];
  groundingUrls: Array<{ title: string; uri: string }>;
  warning?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      grants: [],
      groundingUrls: [],
      warning: 'GEMINI_API_KEY not configured — live web search skipped (Grants.gov Federal API & verified directory remain active).'
    };
  }

  const prompt = `Search the live web right now for currently active, legitimate, NON-RECIPROCAL / NON-DILUTIVE (0% equity, non-repayable) grants, open-source software funds, Web3/AI agent builder grants, and bootstrapped developer credit programs open in 2025/2026${
    focusQuery ? ` specifically related to: ${focusQuery}` : ''
  }.

Return ONLY a valid JSON array (no markdown fences) of 6 real, currently active programs with this exact schema:
[
  {
    "title": "Exact Official Program Name",
    "sponsor": "Official Foundation / Organization Name",
    "category": "CRYPTO_AGENTIC_NON_DILUTIVE" | "OPENSOURCE_PUBLIC_GOODS" | "FEDERAL_RESEARCH_GRANTS" | "CLOUD_COMPUTE_CREDITS" | "MICRO_GRANTS_FOUNDATIONS",
    "awardRange": "e.g. $5,000 - $50,000 USDC or USD",
    "payoutMedium": "CRYPTO_USDC_ETH_SOL" | "USD_FIAT_GRANT" | "CLOUD_COMPUTE_CREDITS",
    "nonReciprocalTerms": "0% Equity · Non-Repayable Grant",
    "approvalType": "ELIGIBILITY_BASED" | "MERIT_REVIEW" | "RETROACTIVE_BUILDERS" | "FEDERAL_COMPETITIVE",
    "deadline": "Rolling or exact date",
    "eligibilitySummary": "Concise real eligibility requirement",
    "applicationUrl": "https://official-domain.org/..."
  }
]`;

  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastWarning: string | undefined;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const rawText = (response.text || '').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingUrls = chunks
        .map((c: any) => ({
          title: String(c?.web?.title || 'Verified Source'),
          uri: String(c?.web?.uri || '')
        }))
        .filter((x: { title: string; uri: string }) => Boolean(x.uri));

      const arrayMatch = rawText.match(/\[[\s\S]*\]/);
      if (!arrayMatch) return { grants: [], groundingUrls };

      const parsed = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(parsed)) return { grants: [], groundingUrls };

      const now = new Date().toISOString();
      const grants: NonReciprocalGrantOpportunity[] = parsed
        .filter((item: any) => item && typeof item.title === 'string' && typeof item.applicationUrl === 'string' && item.applicationUrl.startsWith('http'))
        .map((item: any) => {
          const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 42);
          return {
            id: `live-web-${slug}`,
            title: item.title.trim(),
            sponsor: String(item.sponsor || 'Verified Grant Sponsor').trim(),
            category: (
              ['CRYPTO_AGENTIC_NON_DILUTIVE', 'OPENSOURCE_PUBLIC_GOODS', 'FEDERAL_RESEARCH_GRANTS', 'CLOUD_COMPUTE_CREDITS', 'MICRO_GRANTS_FOUNDATIONS'].includes(item.category)
                ? item.category
                : 'OPENSOURCE_PUBLIC_GOODS'
            ) as GrantCategory,
            awardRange: String(item.awardRange || 'See Official Portal'),
            payoutMedium: (
              ['CRYPTO_USDC_ETH_SOL', 'USD_FIAT_GRANT', 'CLOUD_COMPUTE_CREDITS'].includes(item.payoutMedium)
                ? item.payoutMedium
                : 'USD_FIAT_GRANT'
            ) as NonReciprocalGrantOpportunity['payoutMedium'],
            nonReciprocalTerms: String(item.nonReciprocalTerms || '0% Equity · Non-Repayable Grant'),
            approvalType: (
              ['ELIGIBILITY_BASED', 'MERIT_REVIEW', 'RETROACTIVE_BUILDERS', 'FEDERAL_COMPETITIVE'].includes(item.approvalType)
                ? item.approvalType
                : 'MERIT_REVIEW'
            ) as NonReciprocalGrantOpportunity['approvalType'],
            deadline: String(item.deadline || 'Rolling'),
            eligibilitySummary: String(item.eligibilitySummary || 'Open to eligible builders/applicants.'),
            applicationUrl: item.applicationUrl.trim(),
            source: 'GEMINI_LIVE_WEB_SEARCH' as const,
            discoveredAt: now,
            matchScore: 90
          };
        });

      return { grants, groundingUrls };
    } catch (err: any) {
      const parsedErr = parseGeminiUpstreamError(err);
      lastWarning = parsedErr.isQuotaExhausted
        ? 'Live Google Search Grounding skipped due to Gemini API quota (429). Select a billing-enabled key in Settings > Secrets to enable live AI web search alongside Grants.gov.'
        : parsedErr.message;
      if (!parsedErr.isQuotaExhausted) break;
    }
  }

  return { grants: [], groundingUrls: [], warning: lastWarning };
}

export async function discoverRealNonReciprocalGrants(focusQuery?: string): Promise<{
  success: boolean;
  discoveredNewCount: number;
  grantsGovCount: number;
  liveWebSearchCount: number;
  webSearchWarning?: string;
  state: PersistedGrantsState;
  groundingUrls: Array<{ title: string; uri: string }>;
}> {
  const state = loadGrantsState();
  const [govGrants, webDiscovery] = await Promise.all([
    fetchLiveGrantsGovOpportunities(focusQuery || 'artificial intelligence software cybersecurity'),
    discoverViaGeminiLiveSearch(focusQuery)
  ]);

  const byKey = new Map<string, NonReciprocalGrantOpportunity>();
  const now = new Date().toISOString();

  // Keep curated verified baseline
  for (const base of VERIFIED_NON_RECIPROCAL_GRANTS) {
    byKey.set(base.id, { ...base, discoveredAt: now });
  }
  // Keep previously discovered items
  for (const existing of state.opportunities) {
    if (!byKey.has(existing.id)) {
      byKey.set(existing.id, existing);
    }
  }

  let newCount = 0;
  for (const item of [...govGrants, ...webDiscovery.grants]) {
    const titleKey = item.title.toLowerCase().trim();
    const alreadyExists = Array.from(byKey.values()).some(
      (g) => g.id === item.id || g.title.toLowerCase().trim() === titleKey
    );
    if (!alreadyExists) {
      byKey.set(item.id, item);
      newCount += 1;
    }
  }

  state.opportunities = Array.from(byKey.values()).sort((a, b) => b.matchScore - a.matchScore);
  state.lastAutonomousScanAt = now;
  state.lastScanSummary = `Live autonomous grant scan completed: ${state.opportunities.length} total non-reciprocal opportunities (${govGrants.length} live Grants.gov federal listings, ${webDiscovery.grants.length} live Google Search Grounded programs, ${newCount} newly added).`;
  saveGrantsState(state);

  return {
    success: true,
    discoveredNewCount: newCount,
    grantsGovCount: govGrants.length,
    liveWebSearchCount: webDiscovery.grants.length,
    webSearchWarning: webDiscovery.warning,
    state,
    groundingUrls: webDiscovery.groundingUrls
  };
}

export async function generateGrantApplicationPacket(grantId: string): Promise<{
  success: boolean;
  statusCode?: number;
  application?: GeneratedGrantApplication;
  error?: string;
}> {
  const state = loadGrantsState();
  const grant = state.opportunities.find((g) => g.id === grantId);
  if (!grant) {
    return { success: false, statusCode: 404, error: `Grant opportunity "${grantId}" not found.` };
  }

  const walletState = loadWalletState();
  const agenticWallet =
    walletState.wallets.find((w) => w.role === 'AGENTIC_AUTONOMOUS') || walletState.wallets[0];
  const receivingWalletAddresses = {
    ethereumEip55: agenticWallet?.addresses.ethereumEip55 || '',
    bitcoinSegwit: agenticWallet?.addresses.bitcoinSegwit || '',
    solanaBase58: agenticWallet?.addresses.solanaBase58 || ''
  };

  const p = state.profile;
  const ai = getGeminiClient();
  let markdownPacket = '';
  let modelUsed = 'gemini-4-hydrogen';
  let groundingSources: Array<{ title: string; uri: string }> = [];

  if (!ai) {
    return {
      success: false,
      statusCode: 503,
      error:
        'GEMINI_API_KEY is not configured on the server. Open Settings > Secrets to configure it for AI-tailored grant drafting, or click "Provenance Sheet" to export a structured non-AI cover sheet.'
    };
  }

  const prompt = `Draft a complete, rigorous, submission-ready NON-RECIPROCAL GRANT APPLICATION PACKET tailored specifically for:
- Grant Program: ${grant.title}
- Sponsor: ${grant.sponsor}
- Award Range: ${grant.awardRange}
- Terms: ${grant.nonReciprocalTerms}
- Eligibility: ${grant.eligibilitySummary}
- Official Portal: ${grant.applicationUrl}

Applicant & Project Details (use these exact real details):
- Applicant / Lead Architect: ${p.applicantName}
- Organization / Initiative: ${p.organizationName}
- Email: ${p.email}
- Website: ${p.website}
- GitHub Repository: ${p.githubUrl}
- Zenodo DOI: ${p.zenodoDoi}
- ORCID: ${p.orcid}
- Project Title: ${p.projectTitle}
- Project Summary: ${p.projectSummary}
- Use of Funds: ${p.requestedUseOfFunds}
- Real Self-Custody Receiving Addresses (for crypto grants):
  - Ethereum / Base (EIP-55): ${receivingWalletAddresses.ethereumEip55}
  - Solana (Ed25519): ${receivingWalletAddresses.solanaBase58}
  - Bitcoin (Native SegWit): ${receivingWalletAddresses.bitcoinSegwit}

Produce clean, persuasive Markdown with these exact sections:
1. **Grant Application Cover Sheet** (all metadata & exact payout addresses / contact info)
2. **One-Paragraph Elevator Pitch** (tailored to ${grant.sponsor}'s mission)
3. **Problem Statement & Public-Goods / Ecosystem Impact**
4. **Technical Architecture & Open-Source Innovation**
5. **3-Phase Milestone Plan & Verification Criteria** (concrete deliverables with timelines)
6. **Non-Reciprocal Budget Breakdown** (itemized to fit ${grant.awardRange})
7. **Short-Form Portal Answers** (ready to copy-paste into common fields: "Why are you building this?", "What makes your team uniquely qualified?", "How will open-source users benefit?", "Sustainability plan without equity dilution")
8. **Direct Submission Checklist for ${grant.applicationUrl}**`;

  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastParsedErr: { httpStatus: number; message: string; isQuotaExhausted: boolean } | null = null;

  for (const candidateModel of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior non-dilutive technical grant writer specializing in open-source software, AI agents, Web3 foundation grants, and federal R&D proposals. Write crisp, factual, high-credibility applications without hype or fabricated credentials.',
          tools: [{ googleSearch: {} }]
        }
      });

      markdownPacket = (response.text || '').trim();
      modelUsed = candidateModel;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      groundingSources = chunks
        .map((c: any) => ({
          title: String(c?.web?.title || 'Grant Reference'),
          uri: String(c?.web?.uri || '')
        }))
        .filter((x: { title: string; uri: string }) => Boolean(x.uri));
      lastParsedErr = null;
      break;
    } catch (err: any) {
      lastParsedErr = parseGeminiUpstreamError(err);
      if (!lastParsedErr.isQuotaExhausted) break;
    }
  }

  if (lastParsedErr || !markdownPacket) {
    return {
      success: false,
      statusCode: lastParsedErr?.httpStatus || 502,
      error:
        lastParsedErr?.message ||
        'Unable to generate AI-tailored grant application right now. Open Settings > Secrets to verify your GEMINI_API_KEY.'
    };
  }

  const now = new Date().toISOString();
  const appRecord: GeneratedGrantApplication = {
    id: `grant-app-${crypto.randomBytes(5).toString('hex')}`,
    grantId: grant.id,
    grantTitle: grant.title,
    sponsor: grant.sponsor,
    applicationUrl: grant.applicationUrl,
    awardRange: grant.awardRange,
    payoutMedium: grant.payoutMedium,
    status: 'DRAFT_READY',
    createdAt: now,
    updatedAt: now,
    modelUsed,
    receivingWalletAddresses,
    markdownPacket,
    groundingSources
  };

  state.applications = [
    appRecord,
    ...state.applications.filter((existing) => existing.grantId !== grant.id)
  ].slice(0, 60);
  saveGrantsState(state);

  return { success: true, application: appRecord };
}

/**
 * Explicit non-AI structured provenance & payout cover sheet generator.
 * Compiles only verified user profile fields, official grant listing metadata,
 * and real Agentic Treasury mainnet payout addresses with fill-in-the-blank
 * narrative prompts so users can prepare submissions without requiring AI quota.
 */
export function buildStructuredProvenanceTemplate(grantId: string): {
  success: boolean;
  statusCode?: number;
  application?: GeneratedGrantApplication;
  error?: string;
} {
  const state = loadGrantsState();
  const grant = state.opportunities.find((g) => g.id === grantId);
  if (!grant) {
    return { success: false, statusCode: 404, error: `Grant opportunity "${grantId}" not found.` };
  }

  const walletState = loadWalletState();
  const agenticWallet =
    walletState.wallets.find((w) => w.role === 'AGENTIC_AUTONOMOUS') || walletState.wallets[0];
  const receivingWalletAddresses = {
    ethereumEip55: agenticWallet?.addresses.ethereumEip55 || '',
    bitcoinSegwit: agenticWallet?.addresses.bitcoinSegwit || '',
    solanaBase58: agenticWallet?.addresses.solanaBase58 || ''
  };

  const p = state.profile;
  const now = new Date().toISOString();

  const markdownPacket = `# Non-Reciprocal Grant Provenance & Submission Cover Sheet (Structured Template — No AI)

> Generated directly from your verified Applicant Profile, official grant listing metadata, and real Agentic Treasury mainnet addresses. Fill in the bracketed narrative prompts below or click **Auto-Draft Application** once a billing-enabled Gemini key is configured in Settings > Secrets.

## 1. Official Grant Program Metadata
- **Program Title:** ${grant.title}
- **Sponsor / Funding Body:** ${grant.sponsor}
- **Award Range:** ${grant.awardRange}
- **Non-Reciprocal Terms:** ${grant.nonReciprocalTerms}
- **Approval Track:** ${grant.approvalType.replace(/_/g, ' ')}
- **Deadline:** ${grant.deadline}
- **Official Portal:** ${grant.applicationUrl}
- **Eligibility Summary:** ${grant.eligibilitySummary}

## 2. Verified Applicant & Provenance Record
- **Applicant / Lead Architect:** ${p.applicantName}
- **Organization / Initiative:** ${p.organizationName}
- **Contact Email:** ${p.email}
- **Project Website:** ${p.website}
- **GitHub Repository:** ${p.githubUrl}
- **Zenodo DOI:** ${p.zenodoDoi}
- **ORCID:** ${p.orcid}

## 3. Real Self-Custody Mainnet Payout Addresses (0% Simulated)
- **Ethereum / Base (EIP-55):** \`${receivingWalletAddresses.ethereumEip55}\`
- **Solana (Ed25519 Base58):** \`${receivingWalletAddresses.solanaBase58}\`
- **Bitcoin (Native SegWit Bech32):** \`${receivingWalletAddresses.bitcoinSegwit}\`

## 4. Project Overview (From Your Saved Profile)
- **Project Title:** ${p.projectTitle}
- **Technical Summary:** ${p.projectSummary}
- **Requested Use of Non-Reciprocal Funds:** ${p.requestedUseOfFunds}

## 5. Submission Narrative Worksheet (Complete Before Portal Upload)
- **Sponsor Alignment (Why ${grant.sponsor}):** [Describe how your deliverables advance ${grant.sponsor}'s specific public-goods or ecosystem priorities]
- **Milestone 1 (Days 1–30):** [Deliverable, open-source repository commit/release target, and verification metric]
- **Milestone 2 (Days 31–60):** [Deliverable, test/audit artifact, and public demo endpoint]
- **Milestone 3 (Days 61–90):** [Final release, documentation, and community adoption metric]
- **Itemized Budget Allocation (${grant.awardRange}):** [Break down engineering, infrastructure/RPC/GPU compute, and security audit costs]

## 6. Direct Submission Checklist
- [ ] Verify eligibility requirements on ${grant.applicationUrl}
- [ ] Confirm public GitHub repository (${p.githubUrl}) and live documentation (${p.website}) are accessible
- [ ] Confirm payout wallet or bank/SAM.gov registration matches ${grant.payoutMedium.replace(/_/g, ' ')}
- [ ] Submit application on official portal and mark status as **SUBMITTED** inside Lysander OS
`;

  const appRecord: GeneratedGrantApplication = {
    id: `grant-tpl-${crypto.randomBytes(5).toString('hex')}`,
    grantId: grant.id,
    grantTitle: grant.title,
    sponsor: grant.sponsor,
    applicationUrl: grant.applicationUrl,
    awardRange: grant.awardRange,
    payoutMedium: grant.payoutMedium,
    status: 'DRAFT_READY',
    createdAt: now,
    updatedAt: now,
    modelUsed: 'STRUCTURED_PROVENANCE_TEMPLATE_NO_AI',
    receivingWalletAddresses,
    markdownPacket,
    groundingSources: [{ title: grant.sponsor, uri: grant.applicationUrl }]
  };

  state.applications = [
    appRecord,
    ...state.applications.filter((existing) => existing.grantId !== grant.id)
  ].slice(0, 60);
  saveGrantsState(state);

  return { success: true, application: appRecord };
}

export function exportGrantApplicationToDesktop(applicationId: string): {
  success: boolean;
  filePath?: string;
  error?: string;
} {
  const state = loadGrantsState();
  const app = state.applications.find((a) => a.id === applicationId);
  if (!app) return { success: false, error: 'Application not found.' };

  const desktopDir = path.join(process.cwd(), 'data', 'desktop');
  fs.mkdirSync(desktopDir, { recursive: true });
  const safeName = app.grantTitle.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48);
  const filePath = path.join(desktopDir, `Grant_Application_${safeName}.md`);
  fs.writeFileSync(filePath, app.markdownPacket, 'utf8');
  return { success: true, filePath };
}

let grantAutoHunterStarted = false;
export function startAutonomousGrantDiscoveryDaemon() {
  if (grantAutoHunterStarted) return;
  grantAutoHunterStarted = true;
  // Run initial live Grants.gov + Search Grounding scan 8s after server boot, then every 6 hours
  setTimeout(() => {
    discoverRealNonReciprocalGrants().catch(() => {});
  }, 8000);
  setInterval(() => {
    const state = loadGrantsState();
    if (state.autoScanEnabled) {
      discoverRealNonReciprocalGrants().catch(() => {});
    }
  }, 6 * 60 * 60 * 1000);
}
