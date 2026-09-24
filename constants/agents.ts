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
      'AI Markets Hermes dashboard on {userId}.hermes.aimarkets.vn — OpenRouter/Featherless models (provider cost + 25%).',
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
      'AI Markets NanoClaw on {userId}.nanoclaw.aimarkets.vn — lightweight container agents (provider cost + 25%).',
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
      'AI Markets OpenClaw Control UI on {userId}.openclaw.aimarkets.vn — OpenRouter/Featherless models (provider cost + 25%). PHHotel Nest models stay on phhotel.vn.',
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
    description: 'Chat-first interface for private models and agent tooling.',
    icon: 'webui',
    logoUrl: '/agents/open-webui.png',
    version: '0.6.1',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.openwebui.com',
    public: true,
  },
  {
    id: 'sillytavern',
    slug: 'sillytavern',
    name: 'SillyTavern',
    description: 'Character-driven conversational front-end for creative agents.',
    icon: 'tavern',
    logoUrl: '/agents/sillytavern.png',
    version: '1.12.0',
    model: 'MiniMaxAI/MiniMax-M2.5',
    docsUrl: 'https://docs.sillytavern.app',
    public: true,
  },
  {
    id: 'space-bot',
    slug: 'space-bot',
    name: 'Space Bot',
    description:
      'AI Markets SpaceBot on {userId}.spacebot.aimarkets.vn — always-on community agent with Discord/Slack/Telegram/Twitch channels (provider cost + 25%).',
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

export type AgentGatewayKey = 'openclaw' | 'hermes' | 'nanoclaw' | 'spacebot';

type AgentLike = Partial<
  Pick<
    MarketplaceAgent,
    'id' | 'slug' | 'openclawGateway' | 'hermesGateway' | 'nanoclawGateway' | 'spacebotGateway'
  >
>;

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

/** OpenClaw, Hermes, NanoClaw, or SpaceBot — Launch enabled on the marketplace. */
export function isLaunchableAgent(agent?: AgentLike | null): boolean {
  return (
    isOpenClawAgent(agent) ||
    isHermesAgent(agent) ||
    isNanoclawAgent(agent) ||
    isSpacebotAgent(agent)
  );
}

/** API mount for launch / pairing / ssh: `/v1/openclaw`, `/v1/hermes`, `/v1/nanoclaw`, `/v1/spacebot`. */
export function agentGatewayKey(agent?: AgentLike | null): AgentGatewayKey {
  if (isHermesAgent(agent)) return 'hermes';
  if (isNanoclawAgent(agent)) return 'nanoclaw';
  if (isSpacebotAgent(agent)) return 'spacebot';
  return 'openclaw';
}

/** Only OpenClaw requires the device-pairing approval step. */
export function agentNeedsPairing(agent?: AgentLike | null): boolean {
  return isOpenClawAgent(agent);
}

/** Hire-product slug → catalog agent, so `/product/spacebot-ops-agent` launches SpaceBot. */
export function agentForHireSlug(slug?: string | null): MarketplaceAgent | undefined {
  switch (String(slug || '').trim().toLowerCase()) {
    case 'openclaw-ops-agent':
      return getAgent('openclaw');
    case 'hermes-ops-agent':
      return getAgent('hermes');
    case 'nanoclaw-ops-agent':
      return getAgent('nano-claw');
    case 'spacebot-ops-agent':
      return getAgent('space-bot');
    default:
      return undefined;
  }
}

/** Host subdomain for `{userId}.<subdomain>.aimarkets.vn`. */
export function agentSubdomain(agent?: AgentLike | null): string {
  return agentGatewayKey(agent);
}

export function agentBrand(agent?: AgentLike | null): string {
  if (isHermesAgent(agent)) return 'Hermes';
  if (isNanoclawAgent(agent)) return 'NanoClaw';
  if (isSpacebotAgent(agent)) return 'SpaceBot';
  return 'OpenClaw';
}

/** Primary launch button label. */
export function agentUiName(agent?: AgentLike | null): string {
  if (isHermesAgent(agent)) return 'Hermes Dashboard';
  if (isNanoclawAgent(agent)) return 'NanoClaw Dashboard';
  if (isSpacebotAgent(agent)) return 'SpaceBot Dashboard';
  return 'OpenClaw UI';
}

/** Control UI (OpenClaw) vs Dashboard (Hermes / NanoClaw / SpaceBot). */
export function agentSurfaceName(agent?: AgentLike | null): string {
  return isOpenClawAgent(agent) ? 'Control UI' : 'Dashboard';
}

export function agentHostTemplate(agent?: AgentLike | null): string {
  return `{userId}.${agentSubdomain(agent)}.aimarkets.vn`;
}

export function agentBrandSummary(agent?: AgentLike | null): string {
  if (isHermesAgent(agent)) {
    return 'Self-improving agent with a web dashboard, messaging gateway, and skills.';
  }
  if (isNanoclawAgent(agent)) {
    return 'Isolated container agents with a dashboard — channels installed per agent via skills.';
  }
  if (isSpacebotAgent(agent)) {
    return 'Always-on community agent with a dashboard, memory graph, and Discord/Slack/Telegram/Twitch channels.';
  }
  return 'Operator agent with Control UI, skills, and multi-channel tools.';
}
