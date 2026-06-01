// SVG-визуалы для обучающих карточек. Каждая функция — независимая,
// возвращает строку SVG. Используется как `h("div", { html: V.mainRoad() })`.

// ── Знаки приоритета ────────────────────────────────────────

/** 2.1 Главная дорога — жёлтый ромб с белой каймой */
export function mainRoad() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,4 116,60 60,116 4,60" fill="#0F1115"/>
      <polygon points="60,10 110,60 60,110 10,60" fill="#FFFFFF"/>
      <polygon points="60,20 100,60 60,100 20,60" fill="#FBC02D"/>
    </svg>
  `;
}

/** 2.2 Конец главной дороги — ромб с диагональной полосой */
export function endOfMain() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,4 116,60 60,116 4,60" fill="#0F1115"/>
      <polygon points="60,10 110,60 60,110 10,60" fill="#FFFFFF"/>
      <polygon points="60,20 100,60 60,100 20,60" fill="#FBC02D"/>
      <line x1="22" y1="22" x2="98" y2="98" stroke="#000" stroke-width="6"/>
    </svg>
  `;
}

/** 2.3 Пересечение со второстепенной дорогой (T-вариант сверху) */
export function secondaryCrossing() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="60,8 114,108 6,108" fill="#D32F2F"/>
      <polygon points="60,20 105,102 15,102" fill="#FFFFFF"/>
      <!-- Толстая вертикальная линия — главная дорога -->
      <rect x="56" y="36" width="8" height="60" fill="#000"/>
      <!-- Тонкая горизонтальная линия — второстепенная -->
      <rect x="30" y="62" width="60" height="3" fill="#000"/>
    </svg>
  `;
}

/** 2.4 Уступите дорогу — белый треугольник вершиной вниз с красной каймой */
export function yieldSign() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="6,12 114,12 60,112" fill="#D32F2F"/>
      <polygon points="20,22 100,22 60,98" fill="#FFFFFF"/>
    </svg>
  `;
}

/** 2.5 STOP — красный восьмиугольник с надписью */
export function stopSign() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="35,4 85,4 116,35 116,85 85,116 35,116 4,85 4,35" fill="#D32F2F"/>
      <polygon points="38,12 82,12 108,38 108,82 82,108 38,108 12,82 12,38" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      <text x="60" y="73" font-family="-apple-system, Arial, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">STOP</text>
    </svg>
  `;
}

/** 2.6 Преимущество встречного движения — круг, красная стрелка крупная (встречным), чёрная маленькая (тебе) */
export function oncomingPriority() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="54" fill="#D32F2F"/>
      <circle cx="60" cy="60" r="44" fill="#FFFFFF"/>
      <!-- Чёрная маленькая стрелка вверх (твоя) -->
      <path d="M44 80 L44 50 L40 50 L48 38 L56 50 L52 50 L52 80 Z" fill="#000"/>
      <!-- Красная крупная стрелка вниз (встречного) -->
      <path d="M72 30 L72 76 L66 76 L78 92 L90 76 L84 76 L84 30 Z" fill="#D32F2F"/>
    </svg>
  `;
}

/** 2.7 Преимущество перед встречным — синий квадрат, белая стрелка крупная (твоя), красная маленькая (встречного) */
export function priorityOverOncoming() {
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="112" height="112" fill="#1E5BD6"/>
      <rect x="10" y="10" width="100" height="100" fill="#1E5BD6"/>
      <!-- Белая большая стрелка вверх (твоя) -->
      <path d="M44 92 L44 38 L34 38 L52 16 L70 38 L60 38 L60 92 Z" fill="#FFFFFF"/>
      <!-- Красная маленькая стрелка вниз (встречного) -->
      <path d="M82 24 L82 60 L78 60 L86 72 L94 60 L90 60 L90 24 Z" fill="#D32F2F"/>
    </svg>
  `;
}

// ── Группа: «Уступи / Главная» — сравнительная карточка ──────
export function priorityVsYield() {
  return `
    <svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Слева: главная -->
      <polygon points="60,12 110,60 60,108 10,60" fill="#0F1115"/>
      <polygon points="60,18 104,60 60,102 16,60" fill="#FFFFFF"/>
      <polygon points="60,28 94,60 60,92 26,60" fill="#FBC02D"/>
      <!-- Справа: уступи -->
      <polygon points="130,18 230,18 180,108" fill="#D32F2F"/>
      <polygon points="142,28 218,28 180,96" fill="#FFFFFF"/>
    </svg>
  `;
}
