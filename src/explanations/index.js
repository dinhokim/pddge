// Карта id → объяснение (ручные «человеческие» пояснения).
// Структура объяснения:
//   {
//     correct: "Текст, почему правильный ответ — именно этот.",
//     wrong: { 0: "...", 1: "...", ... },  // индексы НЕ-правильных ответов
//     why?: "Глубже: почему правило вообще так работает (необязательно)."
//   }

import { prioritet } from "./prioritet.js";
import { uchastniki } from "./uchastniki.js";
import { neispravnosti } from "./neispravnosti.js";
import { preduprezhd } from "./preduprezhd.js";
import { zapreshch } from "./zapreshch.js";
import { predpisyv } from "./predpisyv.js";
import { info_ukaz } from "./info_ukaz.js";
import { servis } from "./servis.js";
import { dop_info } from "./dop_info.js";
import { svetofor } from "./svetofor.js";
import { regulirovshchik } from "./regulirovshchik.js";
import { specsignaly } from "./specsignaly.js";
import { avariynaya } from "./avariynaya.js";
import { svetozvuk } from "./svetozvuk.js";
import { dvizhenie } from "./dvizhenie.js";
import { obgon } from "./obgon.js";
import { skorost } from "./skorost.js";
import { distanciya } from "./distanciya.js";
import { ostanovka } from "./ostanovka.js";
import { perekrestki } from "./perekrestki.js";
import { zhd } from "./zhd.js";
import { avtomagistral } from "./avtomagistral.js";
import { zhilaya_zona } from "./zhilaya_zona.js";
import { buksirovka } from "./buksirovka.js";
import { uchebnaya } from "./uchebnaya.js";
import { perevozka } from "./perevozka.js";
import { velo_skot } from "./velo_skot.js";
import { razmetka } from "./razmetka.js";
import { med_pomoshch } from "./med_pomoshch.js";
import { bezopasnost } from "./bezopasnost.js";
import { eko } from "./eko.js";

export const EXPLANATIONS = {
  ...uchastniki,
  ...neispravnosti,
  ...preduprezhd,
  ...prioritet,
  ...zapreshch,
  ...predpisyv,
  ...info_ukaz,
  ...servis,
  ...dop_info,
  ...svetofor,
  ...regulirovshchik,
  ...specsignaly,
  ...avariynaya,
  ...svetozvuk,
  ...dvizhenie,
  ...obgon,
  ...skorost,
  ...distanciya,
  ...ostanovka,
  ...perekrestki,
  ...zhd,
  ...avtomagistral,
  ...zhilaya_zona,
  ...buksirovka,
  ...uchebnaya,
  ...perevozka,
  ...velo_skot,
  ...razmetka,
  ...med_pomoshch,
  ...bezopasnost,
  ...eko,
};
