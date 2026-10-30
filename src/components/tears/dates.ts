// "10/4/26"
export const shortDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${m}/${day}/${String(y).slice(2)}`;
};
