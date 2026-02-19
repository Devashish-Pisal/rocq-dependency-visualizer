const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);
const themeBtn = document.getElementById('themeBtn');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const fileList = document.getElementById('fileList');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('uploadForm');


let selectedFiles = [];

loadSavedFiles();

async function saveFilesToLocalStorage() {
  const stored = [];

  for (const file of selectedFiles) {


    if (file.name.endsWith(".zip")) {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
4
      let binary = "";
      uint8.forEach(b => binary += String.fromCharCode(b));
      const encoded = btoa(binary);

      stored.push({
        name: file.name,
        size: file.size,
        type: file.type,
        isZip: true,
        content: encoded
      });

    } else {
    
      const text = await file.text();
      const encoded = btoa(unescape(encodeURIComponent(text)));

      stored.push({
        name: file.name,
        size: file.size,
        type: file.type,
        isZip: false,
        content: encoded
      });
    }
  }

  localStorage.setItem("savedFiles", JSON.stringify(stored));
}

function renderFiles() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";
    removeBtn.innerHTML = "×";
    removeBtn.onclick = () => removeFile(index);

    chip.appendChild(removeBtn);
    fileList.appendChild(chip);
  });

  submitBtn.disabled = selectedFiles.length === 0;
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFiles();
  saveFilesToLocalStorage();

}

function loadSavedFiles() {
  const saved = localStorage.getItem("savedFiles");
  if (!saved) return;

  const fileData = JSON.parse(saved);
  const restoredFiles = [];

  fileData.forEach(item => {
    let blob;

    if (item.isZip) {
     
      const binary = atob(item.content);
      const len = binary.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      blob = new Blob([bytes], { type: "application/zip" });

    } else {
      const decoded = decodeURIComponent(escape(atob(item.content)));
      blob = new Blob([decoded], { type: item.type || "text/plain" });
    }

    const file = new File([blob], item.name);
    restoredFiles.push(file);
  });

  selectedFiles = restoredFiles;
  renderFiles();
}

function addFiles(newFiles) {
  const accepted = ["dpd", "v", "zip"];

  Array.from(newFiles).forEach(file => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!accepted.includes(ext)) return;

    const exists = selectedFiles.some(
      f => f.name === file.name && f.size === file.size
    );
    if (!exists) selectedFiles.push(file);
  }
);

  renderFiles();
  saveFilesToLocalStorage();
  submitBtn.disabled = selectedFiles.length === 0;


}


fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) addFiles(fileInput.files);
});


["dragenter", "dragover"].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(evt => {
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", e => {
  addFiles(e.dataTransfer.files);
});


form.addEventListener("submit", async e => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    alert("Please select at least one file.");
    return;
  }

  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append("uploaded_files", file);
  });


  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";

    const response = await fetch("/upload/", {
      method: "POST",
      body: formData,
    });


    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    alert("Unexpected response from server.");
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    submitBtn.textContent = "Submit";
  }
});

document.getElementById('openHelp').addEventListener('click', () => {
  window.open('/Frontend/instructions.html', '_blank');
});

themeBtn.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

