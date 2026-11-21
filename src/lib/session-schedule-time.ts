const JAKARTA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function jakartaDateTimeKey(date: Date): string {
  const parts = JAKARTA_DATE_TIME_FORMATTER.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function tanggalJakartaSekarang(now = new Date()): string {
  return jakartaDateTimeKey(now).slice(0, 10);
}

export function jadwalDefaultSesi(now = new Date()) {
  const parts = JAKARTA_DATE_TIME_FORMATTER.formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  let nextMinute = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute) + 1,
  ));
  let endTime = new Date(nextMinute.getTime() + 2 * 60 * 60 * 1000);
  if (endTime.getUTCDate() !== nextMinute.getUTCDate()) {
    nextMinute = new Date(Date.UTC(
      nextMinute.getUTCFullYear(),
      nextMinute.getUTCMonth(),
      nextMinute.getUTCDate() + 1,
      8,
      0,
    ));
    endTime = new Date(nextMinute.getTime() + 2 * 60 * 60 * 1000);
  }
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    tanggal: `${nextMinute.getUTCFullYear()}-${pad(nextMinute.getUTCMonth() + 1)}-${pad(nextMinute.getUTCDate())}`,
    jamMulai: `${pad(nextMinute.getUTCHours())}:${pad(nextMinute.getUTCMinutes())}`,
    jamSelesai: `${pad(endTime.getUTCHours())}:${pad(endTime.getUTCMinutes())}`,
  };
}

export function waktuSesiMasihAkanDatang(
  tanggal: string,
  waktu: string,
  now = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(waktu)) {
    return false;
  }

  const [year, month, day] = tanggal.split("-").map(Number);
  const validDate = new Date(Date.UTC(year, month - 1, day));
  if (
    validDate.getUTCFullYear() !== year ||
    validDate.getUTCMonth() !== month - 1 ||
    validDate.getUTCDate() !== day
  ) {
    return false;
  }

  return `${tanggal}T${waktu}` > jakartaDateTimeKey(now);
}

export const waktuMulaiMasihAkanDatang = waktuSesiMasihAkanDatang;
export const waktuSelesaiMasihAkanDatang = waktuSesiMasihAkanDatang;
