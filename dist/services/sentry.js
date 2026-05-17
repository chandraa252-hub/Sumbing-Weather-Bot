"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapHandler = wrapHandler;
const node_1 = require("@sentry/node");
const environment_1 = require("../environment");
const logger_1 = __importDefault(require("./logger"));
(0, node_1.init)({
    dsn: environment_1.environment.sentry.dsn,
    enabled: environment_1.environment.sentry.dsn !== undefined,
    tracesSampleRate: 1.0,
    environment: environment_1.environment.sentry.environment,
});
(0, node_1.setTags)({
    mainBot: environment_1.environment.mainBot,
    botId: environment_1.environment.botId,
});
logger_1.default.info(undefined, `Sentry environment: ${environment_1.environment.sentry.environment}`);
function wrapHandler(handler, func) {
    const wrappedFunction = async (...args) => {
        await (0, node_1.withScope)(async (scope) => {
            scope.setTag("handler", handler);
            try {
                return await func({ args, scope });
            }
            catch (e) {
                logger_1.default.error(undefined, e, scope);
            }
        });
    };
    return [handler, wrappedFunction];
}
