window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_CONTENT_SCRIPT") return;
  
  const instruction = event.data.payload;

  // --- HANDLE EXPORT ---
  if (instruction.action === 'EXPORT') {
    try {
      const response = await fetch('/notes/api/v3/annotations?contentVersion=9&type=highlight,reference&locale=eng&notesAsHtml=true');
      const data = await response.json();
      
      // Turn the JSON data into a downloadable file
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `notes_download.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      alert("Export failed: " + error.message);
    }
  }

  // --- HANDLE IMPORT ---
  if (instruction.action === 'IMPORT') {
    const annotationsToUpload = instruction.data;
    if (!Array.isArray(annotationsToUpload)) {
      alert("Invalid backup file format.");
      return;
    }

    if (!confirm(`Are you sure you want to import ${annotationsToUpload.length} annotations into this account?`)) return;

    let successCount = 0;
    
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
          annotationId: crypto.randomUUID(), // Assign new ID for target account setup
          source: window.location.origin + window.location.pathname,
          type: item.type || "highlight",
          locale: item.locale || "eng"
        };

        if (item.note) payload.note = item.note;

        await fetch('/notes/api/v3/annotations?returnResponse=false', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        successCount++;
      }
      alert(`Success! Successfully imported ${successCount} out of ${annotationsToUpload.length} annotations.`);
      window.location.reload(); // Reload page to visually show the newly added highlights
    } catch (error) {
      alert(`Import process encountered an error after successfully uploading ${successCount} items: ${error.message}`);
    }
  }
});