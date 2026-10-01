import fs from "fs";
import crypto from "crypto";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const downloadsInProgress = new Map<string, Promise<string>>();

export async function download(url: string): Promise<string> {
    // Version the cache to avoid reusing files written by the old,
    // non-atomic concurrent downloader.
    const hash = crypto.createHash("md5").update(`v2:${url}`).digest("hex");
    const filename = path.resolve(os.tmpdir(), hash);

    if (fs.existsSync(filename)) {
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

async function downloadToFile(url: string, filename: string): Promise<string> {
    const tempFilename = `${filename}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;

    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        if (!response.ok || !response.body) {
            throw new Error(`Error fetching url "${url}" (HTTP ${response.status})`);
        }

        await pipeline(
            Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream),
            fs.createWriteStream(tempFilename, { flags: "wx" })
        );
        await fs.promises.rename(tempFilename, filename);
        return filename;
    } catch (error) {
        await fs.promises.unlink(tempFilename).catch(() => undefined);
        throw error;
    }
}