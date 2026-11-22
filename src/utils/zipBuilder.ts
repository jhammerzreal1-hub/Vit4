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

/**
 * Zero-dependency PKZIP archive builder for browser & Node environments.
 * Uses native CompressionStream ('deflate-raw') when available for compressible files
 * and automatically falls back to STORE (method 0) for binary media or older runtimes.
 */

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

async function tryDeflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();

    // Copy to a concrete ArrayBuffer-backed view for strict DOM BodyInit/BufferSource compatibility
    const inputCopy = new Uint8Array(data.length);
    inputCopy.set(data);

    // Must read concurrently while writing to avoid TransformStream backpressure deadlock on large files (e.g. server.ts)
    const writePromise = (async () => {
      await writer.write(inputCopy);
      await writer.close();
    })();

    const chunks: Uint8Array[] = [];
    let totalLen = 0;
    const readPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLen += value.length;
        }
      }
    })();

    await Promise.all([writePromise, readPromise]);

    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch {
    return null;
  }
}

export interface ZipEntryInput {
  path: string;
  data: Uint8Array;
  compress?: boolean;
  modifiedAt?: Date;
}

export class ZipArchiveBuilder {
  private entries: ZipEntryInput[] = [];
  private encoder = new TextEncoder();

  public addTextFile(filePath: string, content: string, modifiedAt?: Date): void {
    const cleanPath = filePath.replace(/^\/+/, '');
    this.entries.push({
      path: cleanPath,
      data: this.encoder.encode(content),
      compress: true,
      modifiedAt
    });
  }

  public addBinaryFile(filePath: string, bytes: Uint8Array, compress = false, modifiedAt?: Date): void {
    const cleanPath = filePath.replace(/^\/+/, '');
    this.entries.push({
      path: cleanPath,
      data: bytes,
      compress,
      modifiedAt
    });
  }

  public async buildUint8Array(): Promise<Uint8Array> {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let localOffset = 0;

    for (const entry of this.entries) {
      const nameBytes = this.encoder.encode(entry.path);
      const rawBytes = entry.data;
      const crc = crc32(rawBytes);
      const { dosTime, dosDate } = getDosDateTime(entry.modifiedAt || new Date());

      let method = 0; // STORE
      let payload = rawBytes;

      if (entry.compress && rawBytes.length > 64) {
        const deflated = await tryDeflateRaw(rawBytes);
        if (deflated && deflated.length < rawBytes.length) {
          method = 8; // DEFLATE
          payload = deflated;
        }
      }

      // Local File Header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true); // Signature
      lv.setUint16(4, 20, true); // Version needed (2.0)
      lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
      lv.setUint16(8, method, true); // Compression method
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, payload.length, true);
      lv.setUint32(22, rawBytes.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true); // Extra field len
      localHeader.set(nameBytes, 30);

      // Central Directory Header (46 bytes + filename)
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // Signature
      cv.setUint16(4, 20, true); // Version made by
      cv.setUint16(6, 20, true); // Version needed
      cv.setUint16(8, 0x0800, true); // UTF-8 flag
      cv.setUint16(10, method, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, payload.length, true);
      cv.setUint32(24, rawBytes.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true); // Extra len
      cv.setUint16(32, 0, true); // Comment len
      cv.setUint16(34, 0, true); // Disk number start
      cv.setUint16(36, 0, true); // Internal attrs
      cv.setUint32(38, 0, true); // External attrs
      cv.setUint32(42, localOffset, true); // Relative offset of local header
      centralHeader.set(nameBytes, 46);

      localParts.push(localHeader, payload);
      centralParts.push(centralHeader);
      localOffset += localHeader.length + payload.length;
    }

    const centralDirSize = centralParts.reduce((sum, p) => sum + p.length, 0);

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // Signature
    ev.setUint16(4, 0, true); // Disk number
    ev.setUint16(6, 0, true); // Start disk
    ev.setUint16(8, this.entries.length, true);
    ev.setUint16(10, this.entries.length, true);
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, localOffset, true);
    ev.setUint16(20, 0, true); // Comment length

    const totalSize = localOffset + centralDirSize + eocd.length;
    const output = new Uint8Array(totalSize);
    let cursor = 0;

    for (const part of localParts) {
      output.set(part, cursor);
      cursor += part.length;
    }
    for (const part of centralParts) {
      output.set(part, cursor);
      cursor += part.length;
    }
    output.set(eocd, cursor);

    return output;
  }

  public async toBlob(): Promise<Blob> {
    const bytes = await this.buildUint8Array();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new Blob([copy], { type: 'application/zip' });
  }
}
