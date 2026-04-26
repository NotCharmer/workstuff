import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

/**
 * טעינת ‎.env ו־‎.env.local לתוך ‎process.env (מפורש), לפני קריאת מפתחות API.
 * סדר: ‎.env, ואם קיים ‎.env.local — דורס ערכים.
 */
let loaded = false;

function loadAllEnv() {
  if (loaded) return;
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  const localPath = path.join(root, ".env.local");

  if (fs.existsSync(envPath)) {
    const r = dotenv.config({ path: envPath, override: true });
    if (r.error) console.error("[env] .env:", r.error);
  }
  if (fs.existsSync(localPath)) {
    const r = dotenv.config({ path: localPath, override: true });
    if (r.error) console.error("[env] .env.local:", r.error);
  }
  loaded = true;
}

function getStr(key: string, fallback = ""): string {
  loadAllEnv();
  return (process.env[key] ?? fallback).toString().trim();
}

export function getOpenAIApiKey(): string | undefined {
  const v = getStr("OPENAI_API_KEY");
  return v || undefined;
}

export function getOcrProviderName(): string {
  return getStr("OCR_PROVIDER", "mock").toLowerCase() || "mock";
}

/** מודל ברירת־מחדל: gpt-4o — הכי מדויק לטבלאות עברית (יקר מ־mini). */
export function getOpenAIOcrModel(): string {
  return getStr("OPENAI_OCR_MODEL", "gpt-4o") || "gpt-4o";
}
