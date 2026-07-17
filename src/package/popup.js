document.addEventListener('DOMContentLoaded', () => {
  const fetchButton = document.getElementById('fetch-btn');
  const actionButton = document.getElementById('upload-btn'); // This is our upload button now
  const testButton = document.getElementById('test-upload-btn');
  const display = document.getElementById('display');
  let fetchedData = null;

  actionButton.textContent = "2. Upload Data";

  // Fetch annotations
  fetchButton.addEventListener('click', async () => {
    display.textContent = "Fetching...";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      display.textContent = "No active tab found.";
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "FETCH_ANNOTATIONS" }, (response) => {
      if (chrome.runtime.lastError) {
        display.textContent = `Error: ${chrome.runtime.lastError.message}`;
        return;
      }

      if (response && response.success) {
        fetchedData = response.data;
        display.textContent = `Found ${fetchedData.length} annotations! Ready to upload.`;
      } else {
        display.textContent = `Failed to fetch: ${response?.error || 'Unknown error'}`;
      }
    });
  });

  // Upload annotations
  actionButton.addEventListener('click', async () => {
    if (!fetchedData || fetchedData.length === 0) {
      display.textContent = "No data to upload. Please fetch first!";
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      display.textContent = "No active tab found to process upload.";
      return;
    }

    display.textContent = `Starting upload of ${fetchedData.length} items...`;

    chrome.tabs.sendMessage(tab.id, { action: "UPLOAD_ANNOTATIONS", payload: fetchedData }, (response) => {
      if (chrome.runtime.lastError) {
        display.textContent = `Error: ${chrome.runtime.lastError.message}`;
        return;
      }

      if (response && response.success) {
        display.textContent = `Upload Complete! Server responded: ${JSON.stringify(response.results)}`;
      } else {
        display.textContent = `Upload failed: ${response?.error || 'Unknown error'}`;
      }
    });
  });

  // Test single static upload
  testButton.addEventListener('click', async () => {
    display.textContent = "Sending static test upload...";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      display.textContent = "No active tab found.";
      return;
    }

    // Define hardcoded highlight for testing purposes
    const staticHighlight = {
      contentVersion: "9",
      docId: "128342694",
      type: "highlight",
      locale: "eng",
      note: {
        title: "Static Test Title",
        content: "<div>This is a mock note uploaded via a static extension test!</div>"
      },
      highlights: [
        {
          startOffset: 41,
          endOffset: 41,
          pid: "128342700",
          uri: "/scriptures/bofm/1-ne/1.p1",
          color: "green"
        }
      ]
    };

    chrome.tabs.sendMessage(tab.id, { action: "UPLOAD_ANNOTATIONS", payload: [staticHighlight] }, (response) => {
      if (chrome.runtime.lastError) {
        display.textContent = `Error: ${chrome.runtime.lastError.message}`;
        return;
      }

      if (response && response.success) {
        display.textContent = `Static Test Success! Response: ${JSON.stringify(response.results)}`;
      } else {
        display.textContent = `Static Test Failed: ${response?.error || 'Unknown error'}`;
      }
    });
  });
});