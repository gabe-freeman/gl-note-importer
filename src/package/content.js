const observer = new MutationObserver((mutations, obs) => {
  const downloadBtnContainer = document.querySelector('[class="sc-eXlBrm idIptx"]');
  if (downloadBtnContainer && !document.getElementById('ext-export-wrap')) {
    injectCustomButtons(downloadBtnContainer);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

function injectCustomButtons(container) {
  const divider = document.createElement('div');
  divider.style.cssText = 'width:1px; height:32px; background-color:#e2e8f0; margin:0 6px; align-self:center;';
  container.appendChild(divider);

  // Append Export Wrap & Import Wrap
  container.appendChild(createMenuWrapper('EXPORT'));
  container.appendChild(createMenuWrapper('IMPORT'));
}

function createMenuWrapper(type) {
  const wrapper = document.createElement('div');
  wrapper.id = `ext-${type.toLowerCase()}-wrap`;
  wrapper.style.cssText = 'position: relative; display: inline-block;';

  const btn = document.createElement('button');
  btn.className = 'sc-fbydFU guKXSu';
  btn.style.borderRadius = '0px';
  
  if (type === 'EXPORT') {
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" class="sc-oi5tes-0 gDSKMD"><path fill="currentColor" d="M12 3l5 5h-3v8h-4V8H7l5-5zm-7 16h14v2H5v-2z"></path></svg>Export`;
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" class="sc-oi5tes-0 gDSKMD"><path fill="currentColor" d="M12 16l-5-5h3V3h4v8h3l-5 5zm-7 3h14v2H5v-2z"></path></svg>Import`;
  }

  const menu = document.createElement('div');
  menu.id = `ext-${type.toLowerCase()}-menu`;
  menu.style.cssText = 'display:none; position:absolute; top:100%; left:0; background:#fff; border:1px solid #ccc; box-shadow:0 4px 6px rgba(0,0,0,0.1); padding:12px; z-index:10000; width:260px; border-radius:4px; text-align:left;';

  // Toggle behavior
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = menu.style.display;
    document.querySelectorAll('[id$="-menu"]').forEach(m => m.style.display = 'none');
    menu.style.display = current === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => menu.style.display = 'none');
  menu.addEventListener('click', (e) => e.stopPropagation());

  // Action execution button
  const execBtn = document.createElement('button');
  execBtn.textContent = type === 'EXPORT' ? 'Export to File' : 'Import from File';
  execBtn.style.cssText = 'width:100%; padding:6px; background:#2196F3; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; margin-bottom:10px;';

  const loadingText = document.createElement('div');
  loadingText.id = `ext-${type.toLowerCase()}-loading`;
  loadingText.style.cssText = 'display:none; color:#2b6cb0; text-align:center; margin-bottom:10px;';

  menu.appendChild(execBtn);
  menu.appendChild(loadingText);

  // Checkboxes for each data type
  const targetKeys = ['Annotations', 'Highlights', 'Journals', 'Tags', 'Notebooks', 'Sets'];

  targetKeys.forEach(item => {
    const row = document.createElement('div');
    row.style.marginBottom = '8px';

    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex; align-items:center; cursor:pointer; font-size:13px; color:#333;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.id = `cb-${type.toLowerCase()}-${item}`;
    cb.style.marginRight = '8px';

    const warn = document.createElement('div');
    warn.style.cssText = 'display:none; font-size:11px; font-style:italic; color:#a0aec0; margin-left:22px; margin-top:2px;';
    warn.textContent = `${item} will be omitted from notes that reference them.`;

    cb.addEventListener('change', () => {
      warn.style.display = cb.checked ? 'none' : 'block';
    });

    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(item));
    row.appendChild(lbl);
    if (item === 'Tags' || item === 'Notebooks' || item === 'Sets') row.appendChild(warn);
    menu.appendChild(row);
  });

  // Action Execution Connections
  if (type === 'EXPORT') {
    execBtn.addEventListener('click', () => {
      execBtn.style.display = 'none';
      loadingText.style.display = 'block';
      loadingText.textContent = 'Exporting...';
      
      const config = getCheckboxConfig('export');
      injectScript('inject.js', { action: 'EXPORT', config });
    });
  } else {
    execBtn.addEventListener('click', () => {
      const config = getCheckboxConfig('import');
      triggerFilePicker(config, execBtn, loadingText);
    });
  }

  wrapper.appendChild(btn);
  wrapper.appendChild(menu);
  return wrapper;
}

function getCheckboxConfig(prefix) {
  return {
    annotations: document.getElementById(`cb-${prefix}-Annotations`).checked,
    highlights: document.getElementById(`cb-${prefix}-Highlights`).checked,
    journals: document.getElementById(`cb-${prefix}-Journals`).checked,
    tags: document.getElementById(`cb-${prefix}-Tags`).checked,
    notebooks: document.getElementById(`cb-${prefix}-Notebooks`).checked,
    sets: document.getElementById(`cb-${prefix}-Sets`).checked
  };
}

function triggerFilePicker(config, execBtn, loadingElement) {
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
        execBtn.style.display = 'none';
        loadingElement.style.display = 'block';
        loadingElement.textContent = 'Initializing import...';
        
        injectScript('inject.js', { action: 'IMPORT', data: parsedData, config });
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}

// Global window message tracking framework to update loader status natively
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data) return;
  if (e.data.type === "STATUS_UPDATE") {
    const el = document.getElementById(`ext-${e.data.operation}-loading`);
    if (el) el.textContent = e.data.text;
  }
});

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