"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTime = getTime;
function getTime() {
    return Math.round(Date.now() / 1_000);
}
