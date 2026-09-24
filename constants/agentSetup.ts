import type { AgentGatewayKey } from '@/constants/agents';

export type SetupChannelId =
  | 'telegram'
  | 'whatsapp'
  | 'discord'
  | 'teams'
  | 'slack'
  | 'twitch';

export interface ChannelGuide {
  id: SetupChannelId;
  label: string;
  /** token = bot token / app credentials, qr = QR login (WhatsApp Web). */
  kind: 'token' | 'qr';
  envVars: string[];
  /** `openclaw channels …` command to run inside the user sandbox. */
  cli: string;
  steps: string[];
}

/** Ported verbatim from the web setup-wizard `OPENCLAW_CHANNELS`. */
export const OPENCLAW_CHANNELS: ChannelGuide[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
    cli: 'openclaw channels add --channel telegram --token <BOT_TOKEN>',
    steps: [
      'Open Telegram and message @BotFather → /newbot, then copy the bot token.',
      'Add the channel with the command below (or paste the token in Control UI → Settings → Channels).',
      'DM policy defaults to "pairing": message your bot, then approve the pairing code in the Pairing card below.',
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'qr',
    envVars: [],
    cli: 'openclaw channels login --channel whatsapp',
    steps: [
      'OpenClaw links WhatsApp Web via QR — no token needed.',
      'Run the command below in the sandbox, or open Control UI → Settings → Channels → WhatsApp and scan the QR.',
      'Keep the QR on screen until the phone scans it (it expires quickly).',
      'Approve the first DM with the Pairing card below. A dedicated number is recommended.',
    ],
  },
  {
    id: 'discord',
    label: 'Discord',
    kind: 'token',
    envVars: ['DISCORD_BOT_TOKEN'],
    cli: 'openclaw channels add --channel discord --token <BOT_TOKEN>',
    steps: [
      'Create an app + bot in the Discord Developer Portal and enable the Message Content intent.',
      'Invite the bot to your server (OAuth2 URL Generator: bot + applications.commands).',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
  {
    id: 'teams',
    label: 'Teams',
    kind: 'token',
    envVars: ['MSTEAMS_APP_ID', 'MSTEAMS_APP_PASSWORD', 'MSTEAMS_TENANT_ID'],
    cli: 'openclaw channels add --channel msteams',
    steps: [
      'Create an Azure Bot resource and note the Microsoft App ID.',
      'Create a client secret under Manage Password and note your Tenant ID.',
      'Add the Microsoft Teams channel and point the messaging endpoint at your gateway.',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    kind: 'token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
    cli: 'openclaw channels add --channel slack --bot-token xoxb-… --app-token xapp-…',
    steps: [
      'Create an app at api.slack.com/apps (manifest or from scratch).',
      'Install to your workspace and copy the Bot User OAuth Token (xoxb-…).',
      'Create an App-Level Token with the connections:write scope (xapp-…).',
      'Add the channel with the command below, then approve your DM in the Pairing card.',
    ],
  },
];

export interface AgentSetupProfile {
  id: AgentGatewayKey;
  brand: string;
  /** Label of the primary launch button, e.g. "OpenClaw UI". */
  uiName: string;
  docsUrl: string;
  hostTemplate: string;
  /** Whether this wizard shows the messaging channel grid. */
  channels: boolean;
  /** Which channel guide set to render when `channels` is true. */
  channelSet?: 'openclaw' | 'spacebot';
  /** Whether the device/DM pairing card applies (OpenClaw only). */
  pairing?: boolean;
  /** SSH auth model: password (OpenClaw/Hermes/NanoClaw) or key (SpaceBot). */
  sshAuth?: 'password' | 'key';
  /** One-line summary of what this wizard does for the agent. */
  lead: string;
  launchBlurb: string;
  /** How channels/config are managed for this agent. */
  configNote: string;
}

/**
 * SpaceBot channels are configured inside its own dashboard (Config → Channels)
 * or via `config.toml`; there is no CLI `channels add`.
 */
export const SPACEBOT_CHANNELS: ChannelGuide[] = [
  {
    id: 'discord',
    label: 'Discord',
    kind: 'token',
    envVars: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CHANNEL_IDS'],
    cli: 'config.toml → [messaging.discord]',
    steps: [
      'Create an app + bot in the Discord Developer Portal and enable the Message Content intent.',
      'Invite the bot to your server (OAuth2 URL Generator: bot + applications.commands).',
      'In the SpaceBot dashboard open Config → Channels → Discord and paste the bot token.',
      'Optionally add a guild binding (guild_id + channel_ids) to scope the agent to specific channels.',
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'token',
    envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    cli: 'config.toml → [messaging.telegram]',
    steps: [
      'Open Telegram and message @BotFather → /newbot, then copy the bot token.',
      'In the SpaceBot dashboard open Config → Channels → Telegram and paste the token.',
      'Add a telegram binding with the chat_id you want the agent to listen on.',
    ],
  },
  {
    id: 'slack',
    label: 'Slack',
    kind: 'token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
    cli: 'config.toml → [messaging.slack]',
    steps: [
      'Create an app at api.slack.com/apps (manifest or from scratch).',
      'Install to your workspace and copy the Bot User OAuth Token (xoxb-…).',
      'Create an App-Level Token with the connections:write scope (xapp-…).',
      'Paste both tokens in the SpaceBot dashboard under Config → Channels → Slack.',
    ],
  },
  {
    id: 'twitch',
    label: 'Twitch',
    kind: 'token',
    envVars: ['TWITCH_OAUTH_TOKEN', 'TWITCH_USERNAME', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'],
    cli: 'config.toml → [messaging.twitch]',
    steps: [
      'Register an application in the Twitch Developer Console to get a Client ID + Secret.',
      'Generate a chat OAuth token with the chat:read + chat:write scopes.',
      'In the SpaceBot dashboard open Config → Channels → Twitch and enter username + OAuth token.',
      'Add the channels (without the # prefix) the bot should join.',
    ],
  },
];

/** Ported from the web `PROFILES` — i18n keys hold the copy, these hold the wiring. */
export const AGENT_SETUP_PROFILES: Record<AgentGatewayKey, AgentSetupProfile> = {
  openclaw: {
    id: 'openclaw',
    brand: 'OpenClaw',
    uiName: 'OpenClaw UI',
    docsUrl: 'https://docs.openclaw.ai',
    hostTemplate: '{userId}.openclaw.aimarkets.vn',
    channels: true,
    channelSet: 'openclaw',
    pairing: true,
    sshAuth: 'password',
    lead: 'Launch your OpenClaw gateway, connect messaging channels, and open an SSH session to the sandbox.',
    launchBlurb:
      'Opens the OpenClaw Control UI with your marketplace token — the gateway auto-connects and pairs this browser.',
    configNote:
      'Channels live under channels.<id> in openclaw.json; DM policy defaults to "pairing". Secrets can also come from env (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN/SLACK_APP_TOKEN, MSTEAMS_*).',
  },
  hermes: {
    id: 'hermes',
    brand: 'Hermes',
    uiName: 'Hermes Dashboard',
    docsUrl: 'https://hermes-agent.nousresearch.com/docs/',
    hostTemplate: '{userId}.hermes.aimarkets.vn',
    channels: false,
    sshAuth: 'password',
    lead: 'Launch your Hermes dashboard with a per-buyer account, then open an SSH session to the sandbox.',
    launchBlurb:
      'Creates (or reuses) your personal Hermes account and opens the dashboard already signed in. No shared operator password is ever used.',
    configNote:
      'Models and channels live in the Hermes home (~/.hermes/config.yaml + .env). Run `hermes gateway setup` or `hermes setup` in the sandbox to add a platform such as Telegram, Discord, Slack, WhatsApp or Teams.',
  },
  nanoclaw: {
    id: 'nanoclaw',
    brand: 'NanoClaw',
    uiName: 'NanoClaw Dashboard',
    docsUrl: 'https://github.com/qwibitai/nanoclaw',
    hostTemplate: '{userId}.nanoclaw.aimarkets.vn',
    channels: false,
    sshAuth: 'password',
    lead: 'Launch your NanoClaw dashboard and open an SSH session to the sandbox.',
    launchBlurb:
      'Opens the NanoClaw dashboard scoped to your session. Auth uses the dashboard bearer secret — no OpenClaw-style device pairing.',
    configNote:
      'NanoClaw has no config files and does not require device pairing. Channels are installed per agent with the `/add-<channel>` skill in Claude Code (e.g. /add-telegram, /add-slack).',
  },
  spacebot: {
    id: 'spacebot',
    brand: 'SpaceBot',
    uiName: 'SpaceBot Dashboard',
    docsUrl: 'https://docs.spacebot.sh',
    hostTemplate: '{userId}.spacebot.aimarkets.vn',
    channels: true,
    channelSet: 'spacebot',
    pairing: false,
    sshAuth: 'key',
    lead: 'Launch your SpaceBot dashboard, connect messaging channels, and get a temporary SSH key for the sandbox.',
    launchBlurb:
      'Opens the SpaceBot dashboard scoped to your session. The marketplace token is passed in the URL hash and stored automatically — no device pairing.',
    configNote:
      'SpaceBot is a single Rust binary; configuration lives in config.toml ([messaging.*] blocks, [[agents]], [[bindings]]). Edit it from the dashboard (Config → Channels) or over SSH, then the daemon hot-reloads. SSH is key-based on port 2222.',
  },
};
