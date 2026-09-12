import {
  BookOpen,
  Bot,
  Briefcase,
  Cpu,
  Database,
  Film,
  Image as ImageIcon,
  KeyRound,
  Mic,
  Server,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

export type NavGroup = 'generate' | 'apis' | 'platform' | 'talent';

export type CategoryMeta = {
  id: string;
  navGroup: NavGroup;
  hubHref: string;
};

/** Keep in sync with web `AI_CATEGORIES` and API `src/data/categories.js`. */
export const CATEGORY_META: CategoryMeta[] = [
  { id: 'text-to-text', navGroup: 'generate', hubHref: '/category/text-to-text' },
  { id: 'text-to-image', navGroup: 'generate', hubHref: '/category/text-to-image' },
  { id: 'image-to-image', navGroup: 'generate', hubHref: '/category/image-to-image' },
  { id: 'text-to-video', navGroup: 'generate', hubHref: '/category/text-to-video' },
  { id: 'image-to-video', navGroup: 'generate', hubHref: '/category/image-to-video' },
  { id: 'voice-clone', navGroup: 'generate', hubHref: '/category/voice-clone' },
  { id: 'ai-film-series', navGroup: 'generate', hubHref: '/category/ai-film-series' },
  { id: 'story-book', navGroup: 'generate', hubHref: '/category/story-book' },
  { id: 'skill-pack', navGroup: 'generate', hubHref: '/category/skill-pack' },
  { id: 'dataset', navGroup: 'generate', hubHref: '/category/dataset' },
  { id: 'api-endpoint', navGroup: 'apis', hubHref: '/category/api-endpoint' },
  { id: 'inference', navGroup: 'apis', hubHref: '/category/inference' },
  { id: 'gpu-compute', navGroup: 'platform', hubHref: '/category/gpu-compute' },
  { id: 'game-server', navGroup: 'platform', hubHref: '/category/game-server' },
  { id: 'training-service', navGroup: 'platform', hubHref: '/category/training-service' },
  { id: 'agent-runtime', navGroup: 'platform', hubHref: '/category/agent-runtime' },
  { id: 'hire-agent', navGroup: 'platform', hubHref: '/category/hire-agent' },
  { id: 'hire-marketing', navGroup: 'talent', hubHref: '/category/hire-marketing' },
  { id: 'hire-seo', navGroup: 'talent', hubHref: '/category/hire-seo' },
  { id: 'hire-creator', navGroup: 'talent', hubHref: '/category/hire-creator' },
  { id: 'hire-workflow', navGroup: 'talent', hubHref: '/category/hire-workflow' },
  { id: 'hire-build-web', navGroup: 'talent', hubHref: '/category/hire-build-web' },
  { id: 'hire-build-app', navGroup: 'talent', hubHref: '/category/hire-build-app' },
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'text-to-text': Sparkles,
  'text-to-image': ImageIcon,
  'image-to-image': ImageIcon,
  'text-to-video': Film,
  'image-to-video': Film,
  'ai-film-series': Film,
  'voice-clone': Mic,
  'skill-pack': Wrench,
  dataset: Database,
  'hire-agent': Bot,
  'agent-runtime': Bot,
  'api-endpoint': KeyRound,
  inference: Sparkles,
  'gpu-compute': Cpu,
  'game-server': Server,
  'training-service': Wrench,
  'story-book': BookOpen,
  'hire-marketing': Briefcase,
  'hire-seo': Briefcase,
  'hire-creator': Briefcase,
  'hire-workflow': Wrench,
  'hire-build-web': Briefcase,
  'hire-build-app': Briefcase,
};

export const NAV_GROUP_ORDER: NavGroup[] = ['generate', 'apis', 'platform', 'talent'];
export const NAV_GROUP_TITLE: Record<NavGroup, string> = {
  generate: 'group.generate',
  apis: 'group.apis',
  platform: 'group.platform',
  talent: 'group.talent',
};

/** Home tiles match web landing: Generate + Inference / Sell API / Agents. */
export const HOME_CATEGORY_IDS = [
  ...CATEGORY_META.filter((c) => c.navGroup === 'generate').map((c) => c.id),
  'inference',
  'api-endpoint',
  'hire-agent',
] as const;

export const VIDEO_AI_CATEGORIES = ['ai-film-series'] as const;
export const STORIES_CATEGORIES = ['story-book'] as const;
export const AGENT_CATEGORIES = ['hire-agent', 'agent-runtime'] as const;

export const HOME_HUBS = [
  { id: 'work', href: '/work', icon: Briefcase, titleKey: 'hub.work', shortKey: 'hub.work', descKey: 'hub.workDesc' },
] as const;

export function categoriesByNavGroup(group: NavGroup) {
  return CATEGORY_META.filter((c) => c.navGroup === group);
}

export function categoryMeta(id?: string) {
  return CATEGORY_META.find((c) => c.id === id);
}

export function isGpuCategory(id?: string) {
  return id === 'gpu-compute' || id === 'game-server' || id === 'inference';
}

export function isLicenseCategory(id?: string) {
  return id === 'ai-film-series' || id === 'story-book' || id === 'skill-pack' || id === 'dataset';
}

export function isFilmCategory(id?: string) {
  return id === 'ai-film-series';
}

export function isStoryCategory(id?: string) {
  return id === 'story-book';
}

export function isContentCategory(id?: string) {
  return isFilmCategory(id) || isStoryCategory(id);
}

export function isVoiceCategory(id?: string) {
  return id === 'voice-clone';
}

export function isSkillCategory(id?: string) {
  return id === 'skill-pack';
}

export function isDatasetCategory(id?: string) {
  return id === 'dataset';
}

export function isPlaygroundCategory(id?: string) {
  return (
    id === 'text-to-text' ||
    id === 'text-to-image' ||
    id === 'image-to-image' ||
    id === 'text-to-video' ||
    id === 'image-to-video' ||
    id === 'voice-clone' ||
    id === 'api-endpoint' ||
    id === 'inference' ||
    id === 'fine-tune' ||
    id === 'training-service'
  );
}

export function playgroundNeedsImage(id?: string) {
  return id === 'image-to-image' || id === 'image-to-video';
}

export function playgroundResultKind(id?: string): 'text' | 'image' | 'video' | 'audio' {
  if (id === 'text-to-video' || id === 'image-to-video') return 'video';
  if (id === 'text-to-image' || id === 'image-to-image') return 'image';
  if (id === 'voice-clone') return 'audio';
  return 'text';
}

export function isUsagePricing(model?: string) {
  return model === 'usage';
}

export function categoryLabel(id: string, t: (k: string) => string, fallback?: string, kind: 'short' | 'label' = 'short') {
  const key = `cat.${id}.${kind}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  if (kind === 'label') {
    const short = t(`cat.${id}.short`);
    if (short && short !== `cat.${id}.short`) return short;
  }
  return fallback || id;
}

export function catalogChips(t: (k: string) => string, ids: string[] = HOME_CATEGORY_IDS.slice()) {
  return ids.map((id) => ({
    id,
    label: categoryLabel(id, t, id, 'short'),
    href: categoryMeta(id)?.hubHref || `/category/${id}`,
  }));
}
