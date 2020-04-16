const localtunnel = require('localtunnel');
const openBrowser = require('open');
const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');

const PORT = 8998;

const elements = {
  startHosting: document.getElementById('start-hosting'),
  stopHosting: document.getElementById('stop-hosting'),
  publishedDirectoryTrigger: document.getElementById(
    'published-directory-trigger'
  ),
  publishedDirectory: document.getElementById('published-directory'),
  hostedFileNames: document.getElementById('hosted-file-names'),
  hostedFileLinks: document.getElementById('hosted-file-links'),
  hostedFilesCount: document.getElementById('hosted-files-count'),
  back: document.getElementById('back'),
  clipboard: document.getElementById('clipboard'),
  toaster: document.getElementById('toaster'),
};

const views = {
  selectFolder: document.getElementById('view-select-folder'),
  startHosting: document.getElementById('view-start-hosting'),
  hosting: document.getElementById('view-hosting'),
};

setTimeout(() => showView(views.selectFolder), 0);

let publicUrl = '';
let localUrl = '';
let tunnel;
let server;
let hostedFilePaths = [];
let hostedDirectoryPath = '';
elements.back.addEventListener('click', () => showView(views.selectFolder));
elements.startHosting.addEventListener('click', startHosting);
elements.stopHosting.addEventListener('click', stopHosting);

elements.publishedDirectoryTrigger.addEventListener('click', () =>
  elements.publishedDirectory.click()
);

elements.publishedDirectory.addEventListener('change', (e) => {
  if (e.target.files.length === 0) {
    showToasterMessage('No files found');
    return;
  }

  hostedDirectoryPath = e.target.files[0].path;
  hostedFilePaths = fs.readdirSync(e.target.files[0].path);

  elements.hostedFileNames.innerHTML = hostedFilePaths
    .map((path) => `<div class="list-item">${path}</div>`)
    .join('');

  elements.hostedFilesCount.innerHTML = hostedFilePaths.length;

  showView(views.startHosting);
  elements.back.style.display = 'block';
});

function showView(view) {
  [...document.querySelectorAll('.view')].forEach((v) => {
    v.style.display = 'none';
  });
  view.style.display = 'flex';
  elements.back.style.display = 'none';
}

let toasterTimeout = 0;

elements.toaster.addEventListener('click', () => {
  elements.toaster.classList.remove('visible');
});

function showToasterMessage(message) {
  clearTimeout(toasterTimeout);
  elements.toaster.innerHTML = message;

  requestAnimationFrame(() => {
    elements.toaster.classList.add('visible');
  });

  toasterTimeout = setTimeout(() => {
    elements.toaster.classList.remove('visible');
  }, 3000);
}

function copyTextToClipboard(text) {
  elements.clipboard.value = text;
  elements.clipboard.select();
  elements.clipboard.setSelectionRange(0, 99999); /*For mobile devices*/

  document.execCommand('copy');
  showToasterMessage('Copied to clipboard');
}

function startHosting() {
  app.use('/', express.static(hostedDirectoryPath));

  server = app.listen(PORT, () => {
    localtunnel({
      port: 8998,
      host: 'http://serverless.social',
    }).then((_tunnel) => {
      tunnel = _tunnel;
      localUrl = `http://127.0.0.1:${PORT}`;
      publicUrl = tunnel.url;

      const fileLinks = hostedFilePaths.map((path) => ({
        link: `${publicUrl}/${path}`,
        fileName: path,
      }));

      elements.hostedFileLinks.innerHTML = '';

      fileLinks.forEach(({ link, fileName }) => {
        const listItem = document.createElement('div');
        listItem.classList.add('list-item');
        listItem.classList.add('link');

        const label = document.createElement('span');
        label.innerHTML = link;
        label.addEventListener('click', () => openBrowser(link));

        const copyLink = document.createElement('button');
        copyLink.innerHTML = '📋';
        copyLink.classList.add('icon');
        copyLink.title = 'Copy link to clipboard';
        copyLink.addEventListener('click', () => {
          copyTextToClipboard(link);
        });

        listItem.appendChild(label);
        listItem.appendChild(copyLink);

        elements.hostedFileLinks.appendChild(listItem);
      });

      showView(views.hosting);
      showToasterMessage(`Now hosting ${hostedFilePaths.length} file(s)`);
    });
  });
}

function stopHosting() {
  server.close();
  tunnel.close();
  showView(views.selectFolder);
  showToasterMessage('Hosting stopped');
}
