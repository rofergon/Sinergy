#!/usr/bin/env node

import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = buildCrcTable();

function buildCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }

    table[n] = c >>> 0;
  }

  return table;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = crcTable[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function readChunk(buffer, offset) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString("ascii", offset + 4, offset + 8);
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  const data = buffer.subarray(dataStart, dataEnd);
  const nextOffset = dataEnd + 4;

  return { length, type, data, nextOffset };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(compressed, width, height, bytesPerPixel) {
  const inflated = inflateSync(compressed);
  const stride = width * bytesPerPixel;
  const expectedSize = (stride + 1) * height;

  if (inflated.length !== expectedSize) {
    throw new Error(`Unexpected inflated size. Expected ${expectedSize}, got ${inflated.length}.`);
  }

  const output = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[y * (stride + 1)];
    const rowStart = y * stride;
    const sourceStart = y * (stride + 1) + 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceStart + x];
      const left = x >= bytesPerPixel ? output[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[rowStart + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? output[rowStart + x - stride - bytesPerPixel] : 0;
      let value;

      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = (raw + left) & 0xff;
          break;
        case 2:
          value = (raw + up) & 0xff;
          break;
        case 3:
          value = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          value = (raw + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }

      output[rowStart + x] = value;
    }
  }

  return output;
}

function getChannels(colorType) {
  switch (colorType) {
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`Unsupported color type ${colorType}. This script currently supports GA and RGBA PNGs.`);
  }
}

function findAlphaBounds(raw, width, height, bytesPerPixel, alphaIndex, alphaThreshold) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * bytesPerPixel;

    for (let x = 0; x < width; x += 1) {
      const alpha = raw[rowStart + x * bytesPerPixel + alphaIndex];

      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function expandBounds(bounds, width, height, margin) {
  return {
    minX: Math.max(0, bounds.minX - margin),
    minY: Math.max(0, bounds.minY - margin),
    maxX: Math.min(width - 1, bounds.maxX + margin),
    maxY: Math.min(height - 1, bounds.maxY + margin),
  };
}

function cropRaw(raw, width, height, bytesPerPixel, bounds) {
  const nextWidth = bounds.maxX - bounds.minX + 1;
  const nextHeight = bounds.maxY - bounds.minY + 1;
  const cropped = Buffer.alloc(nextWidth * nextHeight * bytesPerPixel);

  for (let y = 0; y < nextHeight; y += 1) {
    const sourceStart = ((bounds.minY + y) * width + bounds.minX) * bytesPerPixel;
    const sourceEnd = sourceStart + nextWidth * bytesPerPixel;
    raw.copy(cropped, y * nextWidth * bytesPerPixel, sourceStart, sourceEnd);
  }

  return { width: nextWidth, height: nextHeight, raw: cropped };
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng({ width, height, bitDepth, colorType, raw, ancillaryChunks }) {
  const bytesPerPixel = getChannels(colorType) * (bitDepth / 8);
  const stride = width * bytesPerPixel;
  const filtered = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const targetStart = y * (stride + 1);
    filtered[targetStart] = 0;
    raw.copy(filtered, targetStart + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [
    createChunk("IHDR", ihdr),
    ...ancillaryChunks.map(({ type, data }) => createChunk(type, data)),
    createChunk("IDAT", deflateSync(filtered)),
    createChunk("IEND", Buffer.alloc(0)),
  ];

  return Buffer.concat([PNG_SIGNATURE, ...chunks]);
}

function trimPng(filePath, { margin, alphaThreshold, outputPath }) {
  const buffer = readFileSync(filePath);

  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("File is not a PNG.");
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  const ancillaryChunks = [];

  while (offset < buffer.length) {
    const chunk = readChunk(buffer, offset);
    offset = chunk.nextOffset;

    if (chunk.type === "IHDR") {
      width = chunk.data.readUInt32BE(0);
      height = chunk.data.readUInt32BE(4);
      bitDepth = chunk.data[8];
      colorType = chunk.data[9];
      const interlace = chunk.data[12];

      if (bitDepth !== 8) {
        throw new Error(`Unsupported bit depth ${bitDepth}. Only 8-bit PNGs are supported.`);
      }

      if (interlace !== 0) {
        throw new Error("Interlaced PNGs are not supported.");
      }
    } else if (chunk.type === "IDAT") {
      idatChunks.push(chunk.data);
    } else if (chunk.type === "IEND") {
      break;
    } else if (!["IHDR", "IEND"].includes(chunk.type) && /^[a-zA-Z]{4}$/.test(chunk.type) && chunk.type !== "tIME") {
      ancillaryChunks.push({ type: chunk.type, data: chunk.data });
    }
  }

  const channels = getChannels(colorType);
  const bytesPerPixel = channels * (bitDepth / 8);
  const alphaIndex = channels - 1;
  const raw = unfilterScanlines(Buffer.concat(idatChunks), width, height, bytesPerPixel);
  const contentBounds = findAlphaBounds(raw, width, height, bytesPerPixel, alphaIndex, alphaThreshold);

  if (!contentBounds) {
    throw new Error("Image has no visible pixels above the selected alpha threshold.");
  }

  const expandedBounds = expandBounds(contentBounds, width, height, margin);
  const cropped = cropRaw(raw, width, height, bytesPerPixel, expandedBounds);
  const output = encodePng({
    width: cropped.width,
    height: cropped.height,
    bitDepth,
    colorType,
    raw: cropped.raw,
    ancillaryChunks,
  });

  writeFileSync(outputPath, output);

  return {
    input: { width, height },
    output: { width: cropped.width, height: cropped.height },
    bounds: expandedBounds,
  };
}

function printUsage() {
  console.log(`Usage:
  node scripts/trim-png-alpha.mjs <file...> [--suffix .trimmed] [--margin 0] [--alpha-threshold 0]
  node scripts/trim-png-alpha.mjs <file> --output ./cropped.png

Notes:
  - Supports non-interlaced 8-bit RGBA and grayscale+alpha PNGs.
  - By default it writes sibling files using the provided suffix before .png.`);
}

function parseArgs(argv) {
  const files = [];
  let suffix = ".trimmed";
  let margin = 0;
  let alphaThreshold = 0;
  let output = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--suffix") {
      suffix = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--margin") {
      margin = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === "--alpha-threshold") {
      alphaThreshold = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      output = argv[index + 1];
      index += 1;
      continue;
    }

    files.push(arg);
  }

  if (!files.length) {
    printUsage();
    process.exit(1);
  }

  if (output && files.length > 1) {
    throw new Error("--output can only be used with a single input file.");
  }

  return { files, suffix, margin, alphaThreshold, output };
}

function getOutputPath(filePath, suffix, explicitOutput) {
  if (explicitOutput) {
    return explicitOutput;
  }

  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
}

try {
  const { files, suffix, margin, alphaThreshold, output } = parseArgs(process.argv.slice(2));

  for (const filePath of files) {
    const outputPath = getOutputPath(filePath, suffix, output);
    const result = trimPng(filePath, { margin, alphaThreshold, outputPath });

    console.log(
      `${path.basename(filePath)} -> ${path.basename(outputPath)} | ` +
        `${result.input.width}x${result.input.height} -> ${result.output.width}x${result.output.height}`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
