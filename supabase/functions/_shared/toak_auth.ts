const textEncoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Node fallback
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(message));
  return bufferToHex(signature);
}

export function buildSigningString(params: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  agentId: string;
}): string {
  return [
    params.method.toUpperCase(),
    params.path,
    params.timestamp,
    params.nonce,
    params.bodyHash,
    params.agentId
  ].join('\n');
}

export function isTimestampFresh(timestampIso: string, windowMs: number, now = new Date()): boolean {
  const timestamp = new Date(timestampIso);
  if (Number.isNaN(timestamp.getTime())) return false;
  return Math.abs(now.getTime() - timestamp.getTime()) <= windowMs;
}
