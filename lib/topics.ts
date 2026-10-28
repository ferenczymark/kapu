// Kliens- és szerveroldalon is használható topic-segédfüggvények

// Egy eszköz topicjai a topic-előtagból (pl. "otthon/kapu")
export function deviceTopics(prefix: string) {
  return {
    command: `${prefix}/parancs`,
    status: `${prefix}/statusz`,
    online: `${prefix}/online`,
  };
}

// Topic-előtag ellenőrzése: nem lehet üres, nem tartalmazhat helyettesítő
// karaktert (+, #), szóközt, és nem kezdődhet / végződhet perjellel.
export function isValidTopicPrefix(prefix: unknown): prefix is string {
  return (
    typeof prefix === 'string' &&
    /^[^\s+#/]+(\/[^\s+#/]+)*$/.test(prefix)
  );
}
