import type { MarketplaceAgent } from '@/api/types';

/**
 * Marketplace agent catalog — keep in sync with the web
 * `MARKETPLACE_AGENTS` in ai-marketplace/src/app/features/agents/openclaw-gateway.service.ts.
 */
export const MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  {
    id: 'hermes',
    slug: 'hermes-agent',
    name: 'Hermes Agent',
    description:
      'AI Markets Hermes dashboard on {userId}.hermes.aimarkets.vn — OpenRouter/Featherless models.',
    icon: 'hermes',
    logoUrl: '/agents/hermes.png',
    version: '1.4.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://hermes-agent.nousresearch.com/docs/',
    public: true,
    hireProductSlug: 'hermes-ops-agent',
    hermesGateway: true,
  },
  {
    id: 'nano-claw',
    slug: 'nano-claw',
    name: 'Nano Claw',
    description:
      'AI Markets NanoClaw on {userId}.nanoclaw.aimarkets.vn — lightweight container agents.',
    icon: 'nano',
    logoUrl: '/agents/nano-claw.png',
    version: '2.3.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://github.com/qwibitai/nanoclaw',
    public: true,
    hireProductSlug: 'nanoclaw-ops-agent',
    nanoclawGateway: true,
  },
  {
    id: 'openclaw',
    slug: 'openclaw',
    name: 'OpenClaw',
    description:
      'AI Markets OpenClaw Control UI on {userId}.openclaw.aimarkets.vn — OpenRouter/Featherless models. PHHotel Nest models stay on phhotel.vn.',
    icon: 'openclaw',
    logoUrl: '/agents/openclaw.png',
    version: '2026.3.24',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://docs.openclaw.ai',
    public: true,
    hireProductSlug: 'openclaw-ops-agent',
    openclawGateway: true,
  },
  {
    id: 'open-webui',
    slug: 'open-webui',
    name: 'Open WebUI',
    description:
      'AI Markets Open WebUI on {userId}.openwebui.aimarkets.vn — private chat workspace with your own model keys (BYOK).',
    icon: 'webui',
    logoUrl: '/agents/open-webui.png',
    version: '0.6.x',
    model: 'BYOK (OpenAI-compatible)',
    docsUrl: 'https://docs.openwebui.com',
    public: true,
    hireProductSlug: 'openwebui-ops-agent',
    openwebuiGateway: true,
  },
  {
    id: 'paperclip',
    slug: 'paperclip',
    name: 'Paperclip',
    description:
      'AI Markets Paperclip on {userId}.paperclip.aimarkets.vn — run a company of AI agents with goals, org chart and budgets.',
    icon: 'paperclip',
    logoUrl: '/agents/paperclip.png',
    version: '0.x',
    model: 'BYOK (Claude / Codex / OpenAI-compatible)',
    docsUrl: 'https://github.com/paperclipai/paperclip',
    public: true,
    hireProductSlug: 'paperclip-ops-agent',
    paperclipGateway: true,
  },
  {
    id: 'space-bot',
    slug: 'space-bot',
    name: 'Space Bot',
    description:
      'AI Markets SpaceBot on {userId}.spacebot.aimarkets.vn — always-on community agent with Discord/Slack/Telegram/Twitch channels.',
    icon: 'space',
    logoUrl: '/agents/space-bot.png',
    version: '2.1.0',
    model: 'openrouter/openrouter/free',
    docsUrl: 'https://docs.spacebot.sh',
    public: true,
    hireProductSlug: 'spacebot-ops-agent',
    spacebotGateway: true,
  },
];

export type AgentGatewayKey = 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot' | 'openwebui' | 'paperclip';

type AgentLike = Partial<
  Pick<
    MarketplaceAgent,
    | 'id'
    | 'slug'
    | 'openclawGateway'
    | 'hermesGateway'
    | 'nanoclawGateway'
    | 'spacebotGateway'
    | 'openwebuiGateway'
    | 'paperclipGateway'
  >
>;

/** Label + whether temporary SSH exists, per runtime. Open WebUI / Paperclip sign in via an SSO ticket only. */
const RUNTIMES: Record<AgentGatewayKey, { brand: string; uiName: string; ssh: boolean; summary: string }> = {
  openclaw: {
    brand: 'OpenClaw',
    uiName: 'OpenClaw UI',
    ssh: true,
    summary: 'Operator agent with Control UI, skills, and multi-channel tools.',
  },
  hermes: {
    brand: 'Hermes',
    uiName: 'Hermes Dashboard',
    ssh: true,
    summary: 'Self-improving agent with a web dashboard, messaging gateway, and skills.',
  },
  nanoclaw: {
    brand: 'NanoClaw',
    uiName: 'NanoClaw Dashboard',
    ssh: true,
    summary: 'Isolated container agents with a dashboard — channels installed per agent via skills.',
  },
  spacebot: {
    brand: 'SpaceBot',
    uiName: 'SpaceBot Dashboard',
    ssh: true,
    summary:
      'Always-on community agent with a dashboard, memory graph, and Discord/Slack/Telegram/Twitch channels.',
  },
  openwebui: {
    brand: 'Open WebUI',
    uiName: 'Open WebUI',
    ssh: false,
    summary: 'Private ChatGPT-style workspace — your own account, chats, knowledge and model keys (BYOK).',
  },
  paperclip: {
    brand: 'Paperclip',
    uiName: 'Paperclip Dashboard',
    ssh: false,
    summary: 'Control plane for a company of AI agents — goals, org chart, tickets, budgets and heartbeats.',
  },
};

/** Case/punctuation-insensitive key so `nano-claw`, `nanoclaw`, `hermes-agent` resolve. */
export function normalizeAgentKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function listMarketplaceAgents(tab: 'public' | 'internal' = 'public'): MarketplaceAgent[] {
  return MARKETPLACE_AGENTS.filter((a) => (tab === 'public' ? a.public : !a.public));
}

export function getAgent(idOrSlug?: string | null): MarketplaceAgent | undefined {
  const key = normalizeAgentKey(idOrSlug);
  if (!key) return undefined;
  return MARKETPLACE_AGENTS.find(
    (a) => normalizeAgentKey(a.id) === key || normalizeAgentKey(a.slug) === key,
  );
}

export function isOpenClawAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.openclawGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'openclaw';
}

export function isHermesAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.hermesGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'hermes' || id === 'hermes-agent';
}

export function isNanoclawAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.nanoclawGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'nano-claw' || id === 'nanoclaw';
}

export function isSpacebotAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.spacebotGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'space-bot' || id === 'spacebot';
}

export function isOpenWebuiAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.openwebuiGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'open-webui' || id === 'openwebui';
}

export function isPaperclipAgent(agent?: AgentLike | null): boolean {
  if (!agent) return false;
  if (agent.paperclipGateway) return true;
  const id = String(agent.id || agent.slug || '').toLowerCase();
  return id === 'paperclip';
}

function runtimeKey(agent?: AgentLike | null): AgentGatewayKey | null {
  if (isHermesAgent(agent)) return 'hermes';
  if (isNanoclawAgent(agent)) return 'nanoclaw';
  if (isSpacebotAgent(agent)) return 'spacebot';
  if (isOpenWebuiAgent(agent)) return 'openwebui';
  if (isPaperclipAgent(agent)) return 'paperclip';
  if (isOpenClawAgent(agent)) return 'openclaw';
  return null;
}

/** OpenClaw, Hermes, NanoClaw, SpaceBot, Open WebUI, or Paperclip — Launch enabled on the marketplace. */
export function isLaunchableAgent(agent?: AgentLike | null): boolean {
  return runtimeKey(agent) !== null;
}

/** API mount for launch / pairing / ssh: `/v1/openclaw`, `/v1/hermes`, …, `/v1/openwebui`, `/v1/paperclip`. */
export function agentGatewayKey(agent?: AgentLike | null): AgentGatewayKey {
  return runtimeKey(agent) || 'openclaw';
}

/** Temporary SSH access exists only for the container runtimes, not the SSO web apps. */
export function agentSupportsSsh(agent?: AgentLike | null): boolean {
  const key = runtimeKey(agent);
  return key !== null && RUNTIMES[key].ssh;
}

/** Only OpenClaw requires the device-pairing approval step. */
export function agentNeedsPairing(agent?: AgentLike | null): boolean {
  return isOpenClawAgent(agent);
}

/** Hire-product slug → catalog agent, so `/product/spacebot-ops-agent` launches SpaceBot. */
export function agentForHireSlug(slug?: string | null): MarketplaceAgent | undefined {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return undefined;
  return MARKETPLACE_AGENTS.find((a) => a.hireProductSlug === key && isLaunchableAgent(a));
}

/** Host subdomain for `{userId}.<subdomain>.aimarkets.vn`. */
export function agentSubdomain(agent?: AgentLike | null): string {
  return agentGatewayKey(agent);
}

export function agentBrand(agent?: AgentLike | null): string {
  return RUNTIMES[agentGatewayKey(agent)].brand;
}

/** Primary launch button label. */
export function agentUiName(agent?: AgentLike | null): string {
  return RUNTIMES[agentGatewayKey(agent)].uiName;
}

/** Control UI (OpenClaw) vs Dashboard (the other runtimes). */
export function agentSurfaceName(agent?: AgentLike | null): string {
  return isOpenClawAgent(agent) ? 'Control UI' : 'Dashboard';
}

export function agentHostTemplate(agent?: AgentLike | null): string {
  return `{userId}.${agentSubdomain(agent)}.aimarkets.vn`;
}

export function agentBrandSummary(agent?: AgentLike | null): string {
  return RUNTIMES[agentGatewayKey(agent)].summary;
}
