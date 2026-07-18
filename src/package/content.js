const observer = new MutationObserver((mutations, obs) => {
  const downloadBtnContainer = document.querySelector('[class="sc-eXlBrm idIptx"]');
  
  if (downloadBtnContainer && !document.getElementById('ext-export-btn')) {
    injectCustomButtons(downloadBtnContainer);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function injectCustomButtons(container) {
  const divider = document.createElement('div');
  divider.style.width = '1px';
  divider.style.height = '32px'; // Matches the general height of the buttons
  divider.style.backgroundColor = '#e2e8f0'; // Light gray line
  divider.style.margin = '0 6px'; // Spacing on left and right
  divider.style.alignSelf = 'center';

  const exportBtn = document.createElement('button');
  exportBtn.id = 'ext-export-btn';
  exportBtn.className = 'sc-fbydFU guKXSu';
  exportBtn.style.borderRadius = '0px';
  exportBtn.title = 'Export JSON';
  exportBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" class="sc-oi5tes-0 gDSKMD">
       <title>Export</title>
       <path fill="currentColor" d="M12 3l5 5h-3v8h-4V8H7l5-5zm-7 16h14v2H5v-2z"></path>
    </svg>
    Export
  `;
  exportBtn.addEventListener('click', () => {
    injectScript('inject.js', { action: 'EXPORT' });
  });

  const importBtn = document.createElement('button');
  importBtn.id = 'ext-import-btn';
  importBtn.className = 'sc-fbydFU guKXSu';
  importBtn.style.borderRadius = '0px';
  importBtn.title = 'Import JSON';
  importBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" class="sc-oi5tes-0 gDSKMD">
       <title>Import</title>
       <path fill="currentColor" d="M12 16l-5-5h3V3h4v8h3l-5 5zm-7 3h14v2H5v-2z"></path>
    </svg>
    Import
  `;
  importBtn.addEventListener('click', () => {
    triggerFilePicker();
  });
  container.appendChild(divider);
  container.appendChild(exportBtn);
  container.appendChild(importBtn);
}

// Helper to pass messages down to inject.js window space
function injectScript(file, dataPayload = null) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.onload = () => {
    if (dataPayload) {
      window.postMessage({ type: "FROM_CONTENT_SCRIPT", payload: dataPayload }, "*");
    }
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// File picker handling
function triggerFilePicker() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        // Ship the data down to inject.js to execute the POSTs
        injectScript('inject.js', { action: 'IMPORT', data: parsedData });
      } catch (err) {
        alert("Failed to parse JSON file. Ensure it is a valid export.");
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}