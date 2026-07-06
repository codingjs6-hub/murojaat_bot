export function getUzbekistanDateString(date = new Date()) {
  // UTC +5 Uzbekistan
  const uzTime = new Date(date.getTime() + 5 * 60 * 60 * 1000);

  const year = uzTime.getUTCFullYear();
  const month = String(uzTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(uzTime.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function formatAppealNumber(dateString: string, count: number) {
  const random = Math.floor(Math.random() * 1000);
  return `SHF-${dateString}-${count}-${random}`;
}
