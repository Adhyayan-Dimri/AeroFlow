export function fmtTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return "—"; }
}

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch { return "—"; }
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${day}/${month}/${year}, ${time}`;
  } catch { return "—"; }
}

export function fmtDateTimeWithNextDay(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";

    const now = new Date();
    const flightDate = new Date(d);

    const isNextDay = flightDate.getHours() < 12 &&
                     (flightDate.getDate() !== now.getDate() ||
                      flightDate.getMonth() !== now.getMonth() ||
                      flightDate.getFullYear() !== now.getFullYear());

    const day = String(flightDate.getDate()).padStart(2, "0");
    const month = String(flightDate.getMonth() + 1).padStart(2, "0");
    const year = flightDate.getFullYear();
    const time = flightDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    let dateStr = `${day}/${month}/${year}`;
    if (isNextDay) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tDay = String(tomorrow.getDate()).padStart(2, "0");
      const tMonth = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const tYear = tomorrow.getFullYear();
      dateStr = `${tDay}/${tMonth}/${tYear}`;
    }

    return `${dateStr}, ${time}`;
  } catch { return "—"; }
}

export function minsFromNow(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}
