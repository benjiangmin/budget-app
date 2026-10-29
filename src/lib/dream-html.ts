// Dreams and crash outs are saved as a tiny bit of HTML so they can have bold, italic, underline
// and lists. Only these tags are ever kept: <p> <br> <strong> <em> <u> <ul> <ol> <li>, with no attributes.
// Everything else is stripped, so nothing saved can run code or load anything on the page.

const ALLOWED = /^<\/?(p|strong|em|u|ul|ol|li)>$|^<br\s*\/?>$/i;

export function cleanDreamHtml(html: string) {
  return html
    .slice(0, 50000)
    .replace(/<[^>]*>?/g, (tag) => (ALLOWED.test(tag) ? tag.toLowerCase().replace(/<br\s*\/?>/, "<br>") : ""));
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Older dreams were plain text: turn each line into a paragraph.
export function plainToHtml(text: string) {
  return text
    .split(/\n/)
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}

// The words only, for the short preview on a closed entry.
export function htmlToText(html: string) {
  return html
    .replace(/<\/p>|<\/li>|<br>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Saved body → safe HTML, whether it was written before or after formatting existed.
export function toDreamHtml(body: string) {
  return /^\s*</.test(body) ? cleanDreamHtml(body) : plainToHtml(body);
}
