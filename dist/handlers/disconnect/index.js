"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDisconnect = handleDisconnect;
const logger_1 = __importDefault(require("../../services/logger"));
async function handleDisconnect() {
    logger_1.default.info(undefined, "Disconnect");
}
