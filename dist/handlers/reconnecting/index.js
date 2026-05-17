"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReconnecting = handleReconnecting;
const logger_1 = __importDefault(require("../../services/logger"));
async function handleReconnecting() {
    logger_1.default.info(undefined, "Reconnecting");
}
