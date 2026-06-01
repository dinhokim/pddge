// Реестр обучающих карточек по темам.
// Ключ — slug темы (как в data.js TOPICS_BY_SLUG).
import { prioritet } from "./prioritet.js";

export const CARDS_BY_SLUG = {
  prioritet,
};

export function getCards(slug) {
  return CARDS_BY_SLUG[slug] || null;
}
export function hasCards(slug) {
  return slug in CARDS_BY_SLUG;
}
