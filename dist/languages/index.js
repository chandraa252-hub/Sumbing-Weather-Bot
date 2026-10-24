"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGES = void 0;
const en_1 = require("./en");
const en_us_1 = require("./en-us");
const id_1 = require("./id");
const id_mp3_1 = require("./id-mp3");
const localized_1 = require("./localized");
exports.LANGUAGES = [en_1.language, en_us_1.language, id_1.language, id_mp3_1.language, ...localized_1.localizedLanguages];
