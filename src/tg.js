// Интеграция с Telegram WebApp. Если запущено вне TG — все функции no-op.

const tg = (typeof window !== "undefined" && window.Telegram?.WebApp) || null;

export const isTG = !!tg;

export function initTG() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    // Полноэкранный режим — только если версия TG поддерживает (≥ 8.0)
    const v = parseFloat(tg.version || "0");
    if (v >= 8 && typeof tg.requestFullscreen === "function") {
      try { tg.requestFullscreen(); } catch {}
    }
    // Подгоним тему TG к новому light-дизайну
    tg.setHeaderColor?.("#FFFBF7");
    tg.setBackgroundColor?.("#FFFBF7");
    tg.enableClosingConfirmation?.();
    // Применить цвета темы TG как CSS-переменные (на случай светлой темы у юзера)
    applyThemeFromTG();
    tg.onEvent?.("themeChanged", applyThemeFromTG);
    // Отключим вертикальные свайпы (чтобы случайно не сворачивать TG)
    tg.disableVerticalSwipes?.();
  } catch (e) {
    console.warn("tg.init failed", e);
  }
}

function applyThemeFromTG() {
  if (!tg?.themeParams) return;
  // Принудительно используем нашу тёмную тему — TG-параметры игнорируем
  // (визуальный стиль приложения — часть бренда), но header/bg уже выставили выше.
}

// ------ BackButton ------
let backHandler = null;
export function setBackButton(handler) {
  if (!tg?.BackButton) return;
  // снять предыдущий
  if (backHandler) {
    try { tg.BackButton.offClick(backHandler); } catch {}
  }
  if (handler) {
    backHandler = () => {
      hapticImpact("light");
      try { handler(); } catch (e) { console.warn(e); }
    };
    tg.BackButton.onClick(backHandler);
    tg.BackButton.show();
  } else {
    backHandler = null;
    tg.BackButton.hide();
  }
}

// ------ MainButton ------
let mainHandler = null;
export function setMainButton({ text, enabled = true, visible = true, color, onClick } = {}) {
  if (!tg?.MainButton) return;
  const mb = tg.MainButton;
  if (mainHandler) {
    try { mb.offClick(mainHandler); } catch {}
    mainHandler = null;
  }
  if (!visible || !onClick) {
    mb.hide();
    return;
  }
  mb.setText(text || "Далее");
  if (color) mb.setParams({ color });
  if (enabled) mb.enable(); else mb.disable();
  mainHandler = () => {
    hapticImpact("light");
    try { onClick(); } catch (e) { console.warn(e); }
  };
  mb.onClick(mainHandler);
  mb.show();
}

export function hideMainButton() {
  if (!tg?.MainButton) return;
  tg.MainButton.hide();
}

// ------ Haptic ------
export function hapticImpact(kind = "light") {
  // kind: "light"|"medium"|"heavy"|"rigid"|"soft"
  try { tg?.HapticFeedback?.impactOccurred?.(kind); } catch {}
}
export function hapticNotify(kind = "success") {
  // kind: "error"|"success"|"warning"
  try { tg?.HapticFeedback?.notificationOccurred?.(kind); } catch {}
}
export function hapticSelection() {
  try { tg?.HapticFeedback?.selectionChanged?.(); } catch {}
}

// ------ CloudStorage (синхронизация прогресса между устройствами) ------
export function cloudGet(key) {
  return new Promise((resolve) => {
    if (!tg?.CloudStorage?.getItem) return resolve(null);
    tg.CloudStorage.getItem(key, (err, val) => resolve(err ? null : val));
  });
}
export function cloudSet(key, value) {
  return new Promise((resolve) => {
    if (!tg?.CloudStorage?.setItem) return resolve(false);
    tg.CloudStorage.setItem(key, value, (err) => resolve(!err));
  });
}

// ------ Close confirmation ------
export function showAlert(msg) {
  return new Promise((resolve) => {
    if (tg?.showAlert) tg.showAlert(msg, () => resolve());
    else { alert(msg); resolve(); }
  });
}
export function showConfirm(msg) {
  return new Promise((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(msg, (ok) => resolve(!!ok));
    else resolve(confirm(msg));
  });
}

// ------ Информация о пользователе ------
export function getUser() {
  return tg?.initDataUnsafe?.user || null;
}

// ------ Версия TG WebApp ------
export function getVersion() {
  return tg?.version || null;
}
