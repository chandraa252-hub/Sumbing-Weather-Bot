"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = handleError;
const logger_1 = __importDefault(require("../../services/logger"));
async function handleError({ scope, args: [error] }) {
    logger_1.default.error(undefined, error, scope);
}
