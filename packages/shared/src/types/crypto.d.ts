// Ambient declarations for Web Crypto API (SubtleCrypto)
// Used by encryption services. Available in browsers and React Native (with polyfill).
// This avoids pulling in the full DOM lib.

declare const crypto: {
  readonly subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};

interface SubtleCrypto {
  decrypt(
    algorithm: AlgorithmIdentifier | AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer>;
  encrypt(
    algorithm: AlgorithmIdentifier | AesGcmParams,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer>;
  importKey(
    format: string,
    keyData: BufferSource,
    algorithm: AlgorithmIdentifier | AesKeyGenParams,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;
  deriveBits(
    algorithm: AlgorithmIdentifier | Pbkdf2Params,
    baseKey: CryptoKey,
    length: number
  ): Promise<ArrayBuffer>;
  deriveKey(
    algorithm: AlgorithmIdentifier | Pbkdf2Params,
    baseKey: CryptoKey,
    derivedKeyType: AlgorithmIdentifier | AesKeyGenParams,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;
}

interface AesGcmParams {
  name: string;
  iv: BufferSource;
}

interface AesKeyGenParams {
  name: string;
  length: number;
}

interface Pbkdf2Params {
  name: string;
  hash: string;
  salt: BufferSource;
  iterations: number;
}

interface CryptoKey {
  readonly algorithm: object;
  readonly extractable: boolean;
  readonly type: string;
  readonly usages: KeyUsage[];
}

type KeyUsage = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits' | 'wrapKey' | 'unwrapKey';
type BufferSource = ArrayBufferView | ArrayBuffer;
type AlgorithmIdentifier = string | { name: string };

// btoa/atob are available in browsers and Node.js 16+/React Native
declare function btoa(data: string): string;
declare function atob(data: string): string;
