window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_CONTENT_SCRIPT") return;
  
  const instruction = event.data.payload;
  const config = instruction.config;

  const updateUI = (operation, text) => {
    window.postMessage({ type: "STATUS_UPDATE", operation, text }, "*");
  };

  // HANDLE EXPORT
  if (instruction.action === 'EXPORT') {
    try {
      const outputData = {};

      if (config.sets) {
        const res = await fetch('/notes/api/v3/sets');
        outputData.sets = (await res.json()).sets || [];
      }
      if (config.notebooks) {
        const res = await fetch('/notes/api/v3/folders?setId=all');
        outputData.notebooks = await res.json();
      }
      if (config.tags) {
        const res = await fetch('/notes/api/v3/tags');
        outputData.tags = await res.json();
      }
      if (config.annotations || config.highlights || config.journals) {
        // Collect all elements
        const res = await fetch('/notes/api/v3/annotations?contentVersion=9&type=highlight,reference,journal&locale=eng&notesAsHtml=true');
        let annotations = await res.json();

        // Server structural filtration rule check
        outputData.annotations = annotations.filter(item => {
          if (item.type === 'journal' && !config.journals) return false;
          if (item.type === 'highlight' && !config.highlights) return false;
          if (!config.annotations) return false;
          return true;
        });
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outputData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `notes_download.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      updateUI('export', 'Export complete!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      alert("Export compilation breakdown: " + error.message);
    }
  }

  // HANDLE IMPORT
  if (instruction.action === 'IMPORT') {
    const fileData = instruction.data;
    const idMap = { notebooks: {}, tags: {}, sets: {} };

    try {
      // Study Sets
      if (config.sets && Array.isArray(fileData.sets)) {
        updateUI('import', 'Importing Study Sets...');
        const reversedSets = [...fileData.sets].reverse();
        for (const item of reversedSets) {
          if (!item.name || !item.setId) continue;
          const targetId = crypto.randomUUID();
          await fetch('/notes/api/v3/sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ name: item.name, setId: targetId }])
          });
          idMap.sets[item.setId] = targetId;
        }
      }

      // Notebooks/Folders
      if (config.notebooks && Array.isArray(fileData.notebooks)) {
        updateUI('import', 'Importing Notebooks...');
        const reversedNotebooks = [...fileData.notebooks].reverse();
        for (const item of reversedNotebooks) {
          if (!item.name || item.name === "Unassigned Items") continue;
          
          const res = await fetch('/notes/api/v3/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ name: item.name }])
          });
          const resData = await res.json();
          if (resData && resData[0] && resData[0].folderId) {
            idMap.notebooks[item.folderId] = resData[0].folderId;
          }
        }
      }

      // Tags
      if (config.tags && Array.isArray(fileData.tags)) {
        updateUI('import', 'Importing Tags...');
        const reversedTags = [...fileData.tags].reverse();
        for (const item of reversedTags) {
          if (!item.name || !item.tagId) continue;
          const targetTagId = crypto.randomUUID();
          await fetch('/notes/api/v3/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ tagId: targetTagId, name: item.name }])
          });
          idMap.tags[item.tagId] = targetTagId;
        }
      }

      // Notes (annotations, hightlights, journals, and references)
      if (Array.isArray(fileData.annotations)) {
        const filteredNotes = fileData.annotations.filter(item => {
          if (item.type === 'journal' && !config.journals) return false;
          if ((item.type === 'highlight' || item.type === 'reference') && !config.highlights) return false;
          if (!config.annotations) return false;
          return true;
        });

        const reversedNotes = [...filteredNotes].reverse();
        const total = reversedNotes.length;

        for (let i = 0; i < total; i++) {
          const item = reversedNotes[i];
          updateUI('import', `Importing [${i + 1}/${total}] notes...`);

          const isJournal = item.type === "journal";
          const newAnnotationId = crypto.randomUUID();
          
          const payload = {
            annotationId: newAnnotationId,
            type: isJournal ? "journal" : "highlight",
            locale: item.locale || "eng",
            source: window.location.origin + window.location.pathname
          };

          if (isJournal) {
            payload.contentVersion = "1";
          } else {
            payload.contentVersion = String(item.contentVersion || 9);
            payload.docId = item.docId;
            payload.highlights = (item.highlights || []).map(h => ({
              startOffset: h.startOffset,
              endOffset: h.endOffset,
              pid: h.pid,
              uri: h.uri,
              color: h.color || "yellow"
            }));
          }

          if (item.note) payload.note = item.note;

          // Map old IDs to new IDs for notebooks, tags, and sets
          if (config.notebooks && Array.isArray(item.folders)) {
            const mappedFolders = item.folders
              .map(f => typeof f === 'string' ? f : f.folderId)
              .map(oldId => idMap.notebooks[oldId])
              .filter(Boolean);
            if (mappedFolders.length > 0) payload.folders = mappedFolders;
          }

          if (config.tags && Array.isArray(item.tags)) {
            const mappedTags = item.tags
              .map(t => typeof t === 'string' ? t : t.tagId)
              .map(oldId => idMap.tags[oldId])
              .filter(Boolean);
            if (mappedTags.length > 0) payload.tags = mappedTags;
          }

          if (config.sets && item.setId && idMap.sets[item.setId]) {
            payload.setId = idMap.sets[item.setId];
          }

          // Make request to create note
          await fetch('/notes/api/v3/annotations?returnResponse=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          // Make request to create reference (if applicable)
          if (!isJournal && Array.isArray(item.refs) && item.refs.length > 0) {
            for (const ref of item.refs) {
              if (!ref.pid) continue;

              const refPayload = {
                name: ref.name,
                contentVersion: String(ref.contentVersion || 9),
                docId: ref.docId,
                locale: ref.locale || "eng",
                pid: ref.pid
              };

              const putUrl = `/notes/api/v3/annotations/${newAnnotationId}/reference/${ref.pid}`;

              await fetch(putUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(refPayload)
              });
            }
          }
        }
      }
      
      updateUI('import', 'Importing complete! Refresh the page.');
    } catch (error) {
      alert(`The execution engine halted due to an issue: ${error.message}`);
    }
  }
});