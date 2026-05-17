"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.athleteToString = athleteToString;
function athleteToString(athlete) {
    if (athlete.userId) {
        return `<@${athlete.userId}>`;
    }
    else {
        return athlete.name;
    }
}
