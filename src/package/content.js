chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- HANDLE FETCH ---
  if (message.action === "FETCH_ANNOTATIONS") {
    const handleFetchMessage = (event) => {
      if (event.source !== window || !event.data || event.data.type !== "FROM_ANNOTATIONS_FETCH") return;
      if (event.data.error) sendResponse({ success: false, error: event.data.error });
      else sendResponse({ success: true, data: event.data.payload });
      window.removeEventListener("message", handleFetchMessage);
    };
    window.addEventListener("message", handleFetchMessage);

    injectScript('inject.js');
    return true;
  }

  // --- HANDLE UPLOAD ---
  if (message.action === "UPLOAD_ANNOTATIONS") {
    const handleUploadMessage = (event) => {
      if (event.source !== window || !event.data || event.data.type !== "FROM_ANNOTATIONS_UPLOAD") return;
      if (event.data.error) sendResponse({ success: false, error: event.data.error });
      else sendResponse({ success: true, results: event.data.payload });
      window.removeEventListener("message", handleUploadMessage);
    };
    window.addEventListener("message", handleUploadMessage);

    window.postMessage({ type: "START_UPLOAD", payload: message.payload }, "*");
    return true;
  }
});

function injectScript(file) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}