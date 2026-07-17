// Listener to catch the data passed down from the popup
window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data) return;

  // --- TRIGGERED ON UPLOAD ---
  if (event.data.type === "START_UPLOAD") {
    const annotationsToUpload = event.data.payload;
    const results = [];

    try {
      for (const item of annotationsToUpload) {
        const payload = {
          contentVersion: String(item.contentVersion || 9),
          docId: item.docId,
          highlights: item.highlights.map(h => ({
            startOffset: h.startOffset,
            endOffset: h.endOffset,
            pid: h.pid,
            uri: h.uri,
            color: h.color || "yellow"
          })),
          annotationId: crypto.randomUUID(), // Generate new ID so it doesn't conflict
          source: window.location.origin + window.location.pathname, 
          type: item.type || "highlight",
          locale: item.locale || "eng"
        };

        if (item.note) {
          payload.note = item.note;
        }

        const response = await fetch('/notes/api/v3/annotations?returnResponse=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const resultData = await response.json();
        results.push(resultData);
      }

      window.postMessage({ type: "FROM_ANNOTATIONS_UPLOAD", payload: results }, "*");

    } catch (error) {
      window.postMessage({ type: "FROM_ANNOTATIONS_UPLOAD", error: error.message }, "*");
    }
  }
});

// --- TRIGGERED ON INITIAL FETCH ---
(async () => {
  try {
    const response = await fetch('/notes/api/v3/annotations?contentVersion=9&type=journal,highlight,reference&locale=eng&notesAsHtml=true');
    // Guard against running this code block logic when inject.js is triggered purely for the message listener
    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      window.postMessage({ type: "FROM_ANNOTATIONS_FETCH", payload: data }, "*");
    }
  } catch (error) {
  }
})();