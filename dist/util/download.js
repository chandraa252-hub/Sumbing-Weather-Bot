"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = download;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const downloadsInProgress = new Map();
async function download(url) {
    // Version the cache to avoid reusing files written by the old,
    // non-atomic concurrent downloader.
    const hash = crypto_1.default.createHash("md5").update(`v2:${url}`).digest("hex");
    const filename = path_1.default.resolve(os_1.default.tmpdir(), hash);
    if (fs_1.default.existsSync(filename)) {
        return filename;
    }
    const existingDownload = downloadsInProgress.get(filename);
    if (existingDownload) {
        return existingDownload;
    }
    const downloadPromise = downloadToFile(url, filename).finally(() => {
        downloadsInProgress.delete(filename);
    });
    downloadsInProgress.set(filename, downloadPromise);
    return downloadPromise;
}
async function downloadToFile(url, filename) {
    const tempFilename = `${filename}.${process.pid}.${crypto_1.default.randomBytes(6).toString("hex")}.tmp`;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        if (!response.ok || !response.body) {
            throw new Error(`Error fetching url "${url}" (HTTP ${response.status})`);
        }
        await (0, promises_1.pipeline)(stream_1.Readable.fromWeb(response.body), fs_1.default.createWriteStream(tempFilename, { flags: "wx" }));
        await fs_1.default.promises.rename(tempFilename, filename);
        return filename;
    }
    catch (error) {
        await fs_1.default.promises.unlink(tempFilename).catch(() => undefined);
        throw error;
    }
}
