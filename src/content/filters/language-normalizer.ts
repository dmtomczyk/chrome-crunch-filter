import type { ContentEntry, UserSettings, VariantType } from '../../shared/types';

interface LanguageAlias {
  code: string;
  label: string;
  aliases: RegExp[];
}

const LANGUAGE_ALIASES: LanguageAlias[] = [
  {
    code: 'ja-JP',
    label: 'Japanese',
    aliases: [/\bjapanese\b/i, /\bjpn\b/i]
  },
  {
    code: 'en-US',
    label: 'English',
    aliases: [/\benglish\b/i, /\beng\b/i]
  },
  {
    code: 'es-LA',
    label: 'Spanish (LatAm)',
    aliases: [/espa[nñ]ol \(am[ée]rica latina\)/i, /latin american spanish/i, /spanish latin america/i, /espanol latin america/i]
  },
  {
    code: 'es-ES',
    label: 'Spanish (Spain)',
    aliases: [/espa[nñ]ol \(espa[ñn]a\)/i, /castilian spanish/i, /spanish \(spain\)/i]
  },
  {
    code: 'pt-BR',
    label: 'Portuguese (Brazil)',
    aliases: [/portugu[eê]s \(brasil\)/i, /brazilian portuguese/i, /portuguese \(brazil\)/i]
  },
  {
    code: 'pt-PT',
    label: 'Portuguese (Portugal)',
    aliases: [/portugu[eê]s \(portugal\)/i, /portuguese \(portugal\)/i]
  },
  {
    code: 'fr-FR',
    label: 'French',
    aliases: [/\bfran[cç]ais\b/i, /\bfrench\b/i]
  },
  {
    code: 'de-DE',
    label: 'German',
    aliases: [/\bdeutsch\b/i, /\bgerman\b/i]
  },
  {
    code: 'it-IT',
    label: 'Italian',
    aliases: [/\bitaliano\b/i, /\bitalian\b/i]
  },
  {
    code: 'hi-IN',
    label: 'Hindi',
    aliases: [/\bhindi\b/i, /हिन्द/i, /हिंदी/i]
  },
  {
    code: 'ta-IN',
    label: 'Tamil',
    aliases: [/\btamil\b/i, /தமிழ்/i]
  },
  {
    code: 'te-IN',
    label: 'Telugu',
    aliases: [/\btelugu\b/i, /తెలుగు/i]
  },
  {
    code: 'ar-ME',
    label: 'Arabic',
    aliases: [/\barabic\b/i, /العربية/i]
  },
  {
    code: 'id-ID',
    label: 'Bahasa Indonesia',
    aliases: [/bahasa indonesia/i, /indonesian/i]
  },
  {
    code: 'ko-KR',
    label: 'Korean',
    aliases: [/한국어/i, /\bkorean\b/i]
  },
  {
    code: 'ru-RU',
    label: 'Russian',
    aliases: [/русский/i, /\brussian\b/i]
  },
  {
    code: 'th-TH',
    label: 'Thai',
    aliases: [/ไทย/i, /\bthai\b/i]
  },
  {
    code: 'zh-CN',
    label: 'Chinese (Mandarin)',
    aliases: [/中文\(普通话\)/i, /mandarin/i, /simplified chinese/i, /chinese \(mandarin\)/i, /普通话/i]
  },
  {
    code: 'zh-TW',
    label: 'Chinese (Taiwan)',
    aliases: [/中文\(台灣\)/i, /traditional chinese/i, /chinese \(taiwan\)/i]
  }
];

const DUB_PATTERNS = [
  /\bdubbed\b/i,
  /\bdub\b/i,
  /\(([^)]*?)dub\)/i
];

const SUB_PATTERNS = [/\bsubtitled\b/i, /\bsubbed\b/i, /\bsubs?\b/i];

const AUDIO_PATTERN = /audio:\s*([^\n]+)/i;
const SUBTITLE_PATTERN = /subtitles?:\s*([^\n]+)/i;
const TITLE_WRAPPED_LANGUAGE_PATTERN = /[\[(]([^\])]+)[\])]/g;

export interface DetectionResult {
  audioLanguages: string[];
  subtitleLanguages: string[];
  variantType: VariantType;
  confidence: number;
}

export function detectCalendarAudioLanguages(label: string | null | undefined): string[] {
  if (!label?.startsWith('Audio languages:')) return [];

  // The calendar exposes base languages, without regional distinctions.
  const codes: Record<string, string[]> = {
    JA: ['ja-JP'], EN: ['en-US'], DE: ['de-DE'], ES: ['es-LA', 'es-ES'],
    FR: ['fr-FR'], PT: ['pt-BR', 'pt-PT'], IT: ['it-IT'], HI: ['hi-IN'],
    TH: ['th-TH'], TA: ['ta-IN'], TE: ['te-IN'], AR: ['ar-ME'],
    ZH: ['zh-CN', 'zh-TW'], KO: ['ko-KR'], RU: ['ru-RU'], ID: ['id-ID'],
    PL: ['pl-PL'], TL: ['tl-PH']
  };
  return [...new Set(label.slice('Audio languages:'.length).split(',')
    .flatMap(code => codes[code.trim().toUpperCase()] ?? []))];
}

export function labelForLanguage(code: string): string {
  return LANGUAGE_ALIASES.find((entry) => entry.code === code)?.label ?? code;
}

export function normalizeLanguageName(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  const match = LANGUAGE_ALIASES.find((entry) => entry.aliases.some((alias) => alias.test(cleaned)));
  return match?.code ?? null;
}

function parseLanguageList(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  const tokens = raw
    .split(/[,/|]/)
    .map((token) => token.trim())
    .filter(Boolean);

  return [...new Set(tokens.map(normalizeLanguageName).filter((value): value is string => Boolean(value)))];
}

function detectInlineLanguageSignals(text: string): string[] {
  const matches: string[] = [];
  for (const alias of LANGUAGE_ALIASES) {
    if (alias.aliases.some((pattern) => pattern.test(text))) {
      matches.push(alias.code);
    }
  }
  return [...new Set(matches)];
}

function detectWrappedLanguageSignals(text: string): string[] {
  const matches = new Set<string>();
  for (const [, wrappedContent] of text.matchAll(TITLE_WRAPPED_LANGUAGE_PATTERN)) {
    const normalized = normalizeLanguageName(wrappedContent);
    if (normalized) {
      matches.add(normalized);
    }
  }
  return [...matches];
}

function stripLanguageAndVariantDecorators(value: string): string {
  let next = value;

  next = next.replace(/\(([^)]*?(dub|sub|subtitled|dubbed)[^)]*?)\)/gi, '');
  next = next.replace(/\[[^\]]*(dub|sub|subtitled|dubbed)[^\]]*\]/gi, '');

  for (const alias of LANGUAGE_ALIASES) {
    for (const pattern of alias.aliases) {
      next = next.replace(new RegExp(`\\((?:[^)]*?)${pattern.source}(?:[^)]*?)\\)`, 'gi'), '');
      next = next.replace(new RegExp(`\\[(?:[^\\]]*?)${pattern.source}(?:[^\\]]*?)\\]`, 'gi'), '');
      next = next.replace(new RegExp(`${pattern.source}\\s+dub`, 'gi'), '');
    }
  }

  next = next.replace(/\b(subtitled|subbed|dubbed)\b/gi, '');
  next = next.replace(/\s+/g, ' ').trim();

  return next;
}

export function normalizeVariantLabel(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  return stripLanguageAndVariantDecorators(value)
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

export function normalizeTitle(rawTitle: string): string {
  return normalizeVariantLabel(rawTitle) ?? rawTitle.replace(/\s+/g, ' ').trim();
}

export function normalizeCrunchyrollLocaleHint(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const upper = raw.toUpperCase();
  const code = upper.match(/(ES419|JAJP|ENUS|ESES|PTBR|PTPT|FRFR|DEDE|ITIT|HIIN|ARSA|IDID|THTH|TAIN|TEIN|ZHCN|ZHTW|RURU|KOKR)$/)?.[1];

  const map: Record<string, string> = {
    JAJP: 'ja-JP',
    ENUS: 'en-US',
    ES419: 'es-LA',
    ESES: 'es-ES',
    PTBR: 'pt-BR',
    PTPT: 'pt-PT',
    FRFR: 'fr-FR',
    DEDE: 'de-DE',
    ITIT: 'it-IT',
    HIIN: 'hi-IN',
    ARSA: 'ar-ME',
    IDID: 'id-ID',
    THTH: 'th-TH',
    TAIN: 'ta-IN',
    TEIN: 'te-IN',
    ZHCN: 'zh-CN',
    ZHTW: 'zh-TW',
    RURU: 'ru-RU',
    KOKR: 'ko-KR'
  };

  return code ? map[code] ?? null : null;
}

export function applyExplicitAudioLanguageHint(detection: DetectionResult, hintedAudioLanguage: string): DetectionResult {
  const variantType: VariantType = hintedAudioLanguage === 'ja-JP' ? 'sub' : 'dub';

  return {
    audioLanguages: [hintedAudioLanguage],
    subtitleLanguages: detection.subtitleLanguages,
    variantType,
    confidence: Math.max(detection.confidence, 0.99)
  };
}

export function detectLanguages(text: string): DetectionResult {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const audioFromLabel = parseLanguageList(normalizedText.match(AUDIO_PATTERN)?.[1] ?? null);
  const subtitlesFromLabel = parseLanguageList(normalizedText.match(SUBTITLE_PATTERN)?.[1] ?? null);
  const inlineMatches = detectInlineLanguageSignals(normalizedText);
  const wrappedMatches = detectWrappedLanguageSignals(normalizedText);

  const audioLanguages = [...new Set(audioFromLabel)];
  const subtitleLanguages = [...new Set(subtitlesFromLabel)];

  const hasDubSignal = DUB_PATTERNS.some((pattern) => pattern.test(normalizedText));
  const hasSubSignal = SUB_PATTERNS.some((pattern) => pattern.test(normalizedText));
  const likelyWrappedDubLanguage = wrappedMatches.find((code) => code !== 'ja-JP');
  const likelyInlineDubLanguage = inlineMatches.find((code) => code !== 'ja-JP');

  if (audioLanguages.length === 0 && hasSubSignal && !hasDubSignal) {
    audioLanguages.push('ja-JP');
  }

  if (audioLanguages.length === 0 && hasDubSignal) {
    const likelyDub = likelyInlineDubLanguage ?? likelyWrappedDubLanguage;
    if (likelyDub) {
      audioLanguages.push(likelyDub);
    }
  }

  if (audioLanguages.length === 0 && likelyWrappedDubLanguage && !hasSubSignal) {
    audioLanguages.push(likelyWrappedDubLanguage);
  }

  if (subtitleLanguages.length === 0 && hasSubSignal) {
    const likelySubtitle = likelyInlineDubLanguage ?? 'en-US';
    subtitleLanguages.push(likelySubtitle);
  }

  let variantType: VariantType = 'unknown';
  const hasNonJapaneseAudio = audioLanguages.some((code) => code !== 'ja-JP');

  if (hasDubSignal && hasSubSignal) {
    variantType = 'mixed';
  } else if (hasDubSignal || hasNonJapaneseAudio) {
    variantType = 'dub';
  } else if (hasSubSignal || audioLanguages.includes('ja-JP')) {
    variantType = 'sub';
  }

  const confidence = Math.max(
    audioLanguages.length > 0 ? 0.75 : 0,
    subtitleLanguages.length > 0 ? 0.65 : 0,
    hasDubSignal || hasSubSignal ? 0.55 : 0,
    wrappedMatches.length > 0 ? 0.52 : 0,
    inlineMatches.length > 0 ? 0.45 : 0.2
  );

  return {
    audioLanguages,
    subtitleLanguages,
    variantType,
    confidence
  };
}

export function isDubLikeEntry(entry: Pick<ContentEntry, 'detectedVariantType' | 'detectedAudioLanguages'>): boolean {
  return (
    entry.detectedVariantType === 'dub' ||
    entry.detectedVariantType === 'mixed' ||
    entry.detectedAudioLanguages.some((code) => code !== 'ja-JP')
  );
}

export function isSubLikeEntry(
  entry: Pick<ContentEntry, 'detectedVariantType' | 'detectedAudioLanguages' | 'detectedSubtitleLanguages'>
): boolean {
  return (
    entry.detectedVariantType === 'sub' ||
    entry.detectedAudioLanguages.includes('ja-JP') ||
    (entry.detectedAudioLanguages.length === 0 && entry.detectedSubtitleLanguages.length > 0)
  );
}

export function matchesPreferredAudioStrict(
  entry: Pick<ContentEntry, 'detectedAudioLanguages'>,
  settings: Pick<UserSettings, 'preferredAudioLanguages'>
): boolean {
  const preferredAudio = settings.preferredAudioLanguages;

  if (preferredAudio.length === 0) {
    return true;
  }

  return entry.detectedAudioLanguages.some((code) => preferredAudio.includes(code));
}

export function matchesPreferredAudioForFiltering(
  entry: Pick<ContentEntry, 'detectedAudioLanguages' | 'detectedVariantType' | 'detectedSubtitleLanguages'>,
  settings: Pick<UserSettings, 'preferredAudioLanguages'>
): boolean {
  if (matchesPreferredAudioStrict(entry, settings)) {
    return true;
  }

  if (
    settings.preferredAudioLanguages.includes('ja-JP') &&
    (entry.detectedVariantType === 'sub' || isSubLikeEntry(entry)) &&
    (entry.detectedAudioLanguages.length === 0 || entry.detectedAudioLanguages.includes('ja-JP'))
  ) {
    return true;
  }

  return false;
}

export function matchesPreferredLanguages(entry: ContentEntry, settings: UserSettings): boolean {
  const preferredAudio = settings.preferredAudioLanguages;
  const preferredSubtitles = settings.preferredSubtitleLanguages;

  if (matchesPreferredAudioForFiltering(entry, settings)) {
    return true;
  }

  if (
    preferredSubtitles.length > 0 &&
    entry.detectedSubtitleLanguages.some((code) => preferredSubtitles.includes(code))
  ) {
    return true;
  }

  if (preferredAudio.length === 0 && preferredSubtitles.length === 0) {
    return true;
  }

  return false;
}
