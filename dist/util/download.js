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
async function download(url) {
    const hash = crypto_1.default.createHash("md5").update(url).digest("hex");
    const filename = path_1.default.resolve(os_1.default.tmpdir(), hash);
    if (!fs_1.default.existsSync(filename)) {
        const response = await fetch(url);
        if (!response.ok || !response.body) {
            throw new Error(`Error fetching url "${url}"`);
        }
        const stream = stream_1.Readable.fromWeb(response.body).pipe(fs_1.default.createWriteStream(filename));
        await (0, promises_1.finished)(stream);
    }
    return filename;
}
