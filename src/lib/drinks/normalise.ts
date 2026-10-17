/**
 * Canonical form of drink text. Used both for matching and as the parse-cache / recents key, so
 * "2 Schooners of VB!" and "2 schooners of vb" share a cache entry.
 */
export function normaliseText(text: string) {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // jägermeister -> jagermeister
      .toLowerCase()
      .replace(/½/g, " half ")
      .replace(/¼/g, " quarter ")
      .replace(/[’'`]/g, "") // jack daniel's -> jack daniels
      .replace(/([a-wyz]){2,}/g, "$1$1") // "spritzzz" -> "spritzz" (x is left alone for XXXX)
      .replace(/&/g, " and ")
      .replace(/\+/g, " , ")
      // keep decimal points and percent signs, everything else that is not a letter/digit/comma
      // becomes a space
      .replace(/(\d)\.(\d)/g, "$1\u0000$2")
      .replace(/[.!?:]+(\s|$)/g, ";$1") // sentence ends separate drinks
      .replace(/\s-\s|\s-$|^-\s/g, " ; ")
      .replace(/[^a-z0-9%,\u0000\n;]+/g, " ")
      .replace(/\u0000/g, ".")
      .replace(/\s*([,;\n])\s*/g, "$1 ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;]+|[\s,;]+$/g, "") // "vb!" and "vb" share a cache / recents key
  );
}

/** Light plural stemming applied to both catalog aliases and user tokens. */
export function stem(token: string) {
  if (token.length <= 3 || /\d/.test(token)) return token.replace(/^(\d+)s$/, "$1"); // 196s -> 196
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`; // tinnies -> tinny
  if (token.endsWith("sses")) return token.slice(0, -2); // glasses -> glass
  if (token.endsWith("ss") || token.endsWith("us")) return token;
  if (token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenise(text: string) {
  return text.split(" ").filter(Boolean).map(stem);
}

/** Optimal-string-alignment edit distance (Levenshtein + adjacent transpositions). */
export function editDistance(a: string, b: string, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

/** How many typos a token of this length may contain and still match. */
export function typoAllowance(length: number) {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}
