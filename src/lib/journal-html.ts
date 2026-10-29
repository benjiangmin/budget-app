// Journal entries are saved as a small bit of HTML: paragraphs, bold, italic, underline, lists and
// pictures placed in the text. Everything else is stripped before saving and before showing,
// so nothing saved can run code or load anything unexpected.
//
// Pictures are saved as <img data-path="abc.jpg"> (the file's name in the private folder).
// The real, temporary link is added only when the page is shown.

const TAGS = /^<\/?(p|strong|em|u|ul|ol|li)>$|^<br\s*\/?>$/i;
const PATH = /^[0-9a-f-]{36}\.(jpg|jpeg|png|gif|webp)$/i;

export function cleanJournalHtml(html: string) {
  return html.slice(0, 200000).replace(/<[^>]*>?/g, (tag) => {
    if (TAGS.test(tag)) return tag.toLowerCase().replace(/<br\s*\/?>/, "<br>");
    if (/^<img\s/i.test(tag)) {
      const path = tag.match(/data-path="([^"]+)"/i)?.[1];
      return path && PATH.test(path) ? `<img data-path="${path}">` : "";
    }
    return "";
  });
}

// Every picture file named in an entry.
export function picturePaths(html: string) {
  return Array.from(html.matchAll(/<img data-path="([^"]+)">/g), (m) => m[1]);
}

// The words only, for previews/search snippets.
export function journalText(html: string) {
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

// True when there's nothing worth saving (no words and no pictures).
export const isBlank = (html: string) => !journalText(html) && picturePaths(html).length === 0;
