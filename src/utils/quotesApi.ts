import { translate } from "@vitalets/google-translate-api";
import axios from "axios";
import { Collection } from "discord.js";

export interface GetRandomQuoteResponse {
  q: string;
  a: string;
  h: string;
}

const quotesApi = axios.create({
  baseURL: "https://zenquotes.io/api/random/",
});

const QUOTES_CACHE_MAX_SIZE = 100;
const quotesCache = new Collection<string, string>();

export async function getRandomQuote(): Promise<string | undefined> {
  try {
    if (quotesCache.size >= QUOTES_CACHE_MAX_SIZE) {
      const keys = Array.from(quotesCache.keys());
      const entriesToRemove = keys.slice(0, 30);
      quotesCache.sweep((_, key) => entriesToRemove.includes(key));
    }

    const response = await quotesApi.get<GetRandomQuoteResponse[]>("/");
    const phrase = response?.data.at(0);
    if (!phrase) {
      return;
    }

    const translatedPhrase = await translate(phrase.q, { to: "pt-br" });
    if (!translatedPhrase) {
      return;
    }

    quotesCache.set(phrase.a, translatedPhrase.text);
    return `${translatedPhrase.text} — ${phrase.a}`;
  } catch {
    const randomKey = quotesCache.randomKey();
    if (!randomKey) {
      return;
    }
    const cachedQuote = quotesCache.get(randomKey);
    return `${cachedQuote} — ${randomKey}`;
  }
}
