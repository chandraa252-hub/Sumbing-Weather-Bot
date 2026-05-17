"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDelay = isValidDelay;
function isValidDelay(delay) {
    if (delay < 0) {
        return false;
    }
    if (delay > 24 * 60 * 60) {
        return false;
    }
    if (isNaN(delay)) {
        return false;
    }
    return true;
}
