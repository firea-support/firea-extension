"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    location: process.env.LOCATION || "us-central1",
    collectionPath: process.env.COLLECTION_PATH || "collectionName",
    projectApiKey: process.env.PROJECT_API_KEY || "some_api_key",
    fireaProjectId: process.env.F_PROJECT_ID || "some_api_key",
    doBackfill:process.env.DO_BACKFILL || true,
};