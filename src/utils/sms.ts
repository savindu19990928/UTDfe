// SMS segment counting.
// Carriers bill per 160-character GSM-7 segment (153 when a message is split
// across several parts). A single non-GSM character forces the whole message
// into UCS-2, which drops the limit to 70 (67 when split).

const GSM_BASE = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(
    ''
  )
);

const GSM_EXTENDED = new Set('^{}\\[~]|€'.split(''));

export type SmsEncoding = 'GSM-7' | 'Unicode';

export interface SmsCount {
  characters: number;
  encoding: SmsEncoding;
  segments: number;
  /** Characters left before another segment is started. */
  remaining: number;
}

export function countSms(message: string): SmsCount {
  const chars = Array.from(message);
  const isGsm = chars.every((c) => GSM_BASE.has(c) || GSM_EXTENDED.has(c));

  if (!isGsm) {
    const characters = chars.length;
    const segments = characters === 0 ? 0 : characters <= 70 ? 1 : Math.ceil(characters / 67);
    const capacity = segments <= 1 ? 70 : segments * 67;
    return {
      characters,
      encoding: 'Unicode',
      segments,
      remaining: Math.max(capacity - characters, 0)
    };
  }

  // Extended GSM characters occupy two septets.
  const characters = chars.reduce(
    (total, c) => total + (GSM_EXTENDED.has(c) ? 2 : 1),
    0
  );
  const segments = characters === 0 ? 0 : characters <= 160 ? 1 : Math.ceil(characters / 153);
  const capacity = segments <= 1 ? 160 : segments * 153;

  return {
    characters,
    encoding: 'GSM-7',
    segments,
    remaining: Math.max(capacity - characters, 0)
  };
}