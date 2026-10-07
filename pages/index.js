const EDIT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
const RELOAD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-cw"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
const DELETE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

document.addEventListener('DOMContentLoaded', function () {
    const table = document.querySelector('.golink-table tbody');
    const siteFooter = document.querySelector('.site-footer');
    const golinkCountLabel = document.querySelector('.golink-home--count');
    const remoteForm = document.querySelector('form#remote-golinks');
    const remoteURLInput = remoteForm.querySelector('input[name="url"]');
    const remoteStatus = remoteForm.querySelector('.remote-golinks--status');
    const remoteView = remoteForm.querySelector('.remote-golinks--view');
    const remoteLink = remoteForm.querySelector('.remote-golinks--link');
    const remoteReloadLink = remoteForm.querySelector('.remote-golinks--reload');
    const remoteEditLink = remoteForm.querySelector('.remote-golinks--edit');
    const remoteDeleteLink = remoteForm.querySelector('.remote-golinks--delete');
    const remoteInputSection = remoteForm.querySelector('.remote-golinks--input');
    const remoteCancelLink = remoteForm.querySelector('.remote-golinks--cancel');
    const remoteSkipHeaderCheckbox = remoteForm.querySelector('input[name="skipHeader"]');
    let savedRemoteURL = '';
    
    async function rerenderTable() {
        table.querySelectorAll('.golink-row').forEach(row => row.remove());

        const { golinks, remoteGolinks = {} } = await chrome.storage.local.get(["golinks", "remoteGolinks"]);
        const localEntries = Object.entries(golinks || {}).map(([key, value]) => [key, value, false]);
        const remoteEntries = Object.entries(remoteGolinks).map(([key, value]) => [key, value, true]);

        // Alphabetical by name; a local golink comes before the remote golink it overrides
        const entries = [...localEntries, ...remoteEntries]
            .sort(([keyA, , isRemoteA], [keyB, , isRemoteB]) => keyA.localeCompare(keyB) || isRemoteA - isRemoteB);

        const totalGolinkCount = Object.keys({ ...remoteGolinks, ...golinks }).length;
        golinkCountLabel.textContent = `${totalGolinkCount} link${totalGolinkCount === 1 ? '' : 's'}`;

        for (let [key, value, isRemote] of entries) {
            const row = table.insertRow();
            row.className = 'golink-row';

            const nameCell = row.insertCell();
            nameCell.textContent = key;
            if (isRemote && Object.hasOwn(golinks || {}, key)) {
                row.classList.add('golink-row--overridden');
                row.title = 'Overridden';
            }

            const urlCell = row.insertCell();
            urlCell.className = 'word-break-all';
            const href = document.createElement('a');
            href.href = value;
            href.className = 'text-black';
            href.textContent = value;
            urlCell.appendChild(href);

            const actionsCell = row.insertCell();
            actionsCell.className = 'nowrap';

            if (isRemote) {
                const remoteLabel = document.createElement('span');
                remoteLabel.className = 'golink-row--remote';
                remoteLabel.textContent = 'remote';
                actionsCell.appendChild(remoteLabel);
                continue;
            }

            const editLink = document.createElement('a');
            editLink.innerHTML = EDIT_ICON;
            editLink.href = `/pages/edit.html?name=${encodeURIComponent(key)}`;
            editLink.className = 'golink-row--action';
            editLink.title = 'Edit golink';
            editLink.ariaLabel = 'Edit golink';
            actionsCell.appendChild(editLink);

            const deleteLink = document.createElement('a');
            deleteLink.className = 'golink-row--action';
            deleteLink.innerHTML = DELETE_ICON;
            deleteLink.setAttribute('href', '#');
            deleteLink.title = 'Delete golink';
            deleteLink.ariaLabel = 'Delete golink';
            deleteLink.addEventListener('click', async (event) => {
                event.target.disabled = true;
                if (confirm(`Delete golink '${key}'?`) == true) {
                    const { golinks } = await chrome.storage.local.get("golinks");
                    delete golinks[key];
                    await chrome.storage.local.set({ golinks });
                    rerenderTable();
                }
                event.target.disabled = false;
            });
            actionsCell.appendChild(deleteLink);
        }

        const currentGolinkCount = Object.keys(golinks || {}).length;
        if (currentGolinkCount === 0) {
            return;
        }

        const tableFooter = document.querySelector('.golink-table--footer');
        tableFooter.innerHTML = '';
        const deleteAllLink = document.createElement('a');
        deleteAllLink.addEventListener('click', async (event) => {
            event.target.disabled = true;
            const confirmation = `delete ${currentGolinkCount} link${currentGolinkCount > 1 ? 's' : ''}`;
            const answer = prompt(`Are you sure? Type '${confirmation}' to confirm.`);
            if (answer.toLocaleLowerCase() !== confirmation.toLocaleLowerCase()) {
                return;
            }
            await chrome.storage.local.set({ golinks: {} });
            rerenderTable();
            event.target.disabled = false;
        });
        deleteAllLink.setAttribute('href', '#');
        deleteAllLink.textContent = 'Delete all personal links';
        tableFooter.appendChild(deleteAllLink);
    }

    function renderSiteFooter() {
        const { version, homepage_url } = chrome.runtime.getManifest();
        const footerRepoLink = document.createElement('a');
        footerRepoLink.href = homepage_url;
        footerRepoLink.target = '_blank';
        footerRepoLink.textContent = `v${version}`;
        siteFooter.appendChild(footerRepoLink);

        const footerHelpText = document.createElement('span');
        footerHelpText.textContent = ' | ';
        siteFooter.appendChild(footerHelpText);

        const footerHelpLink = document.createElement('a');
        footerHelpLink.href = '/pages/help.html';
        footerHelpLink.textContent = 'Help';
        siteFooter.appendChild(footerHelpLink);
    }

    async function renderRemoteStatus() {
        const { remoteGolinksURL, remoteGolinks, remoteGolinksError } = await chrome.storage.local.get(["remoteGolinksURL", "remoteGolinks", "remoteGolinksError"]);
        remoteStatus.classList.toggle('remote-golinks--status-error', Boolean(remoteGolinksURL && remoteGolinksError));
        if (!remoteGolinksURL) {
            remoteStatus.textContent = '';
        } else if (remoteGolinksError) {
            remoteStatus.textContent = `Failed to load remote golinks: ${remoteGolinksError}`;
        } else if (remoteGolinks === undefined) {
            remoteStatus.textContent = 'Loading remote golinks...';
        } else {
            const remoteGolinkCount = Object.keys(remoteGolinks).length;
            remoteStatus.textContent = `${remoteGolinkCount} remote link${remoteGolinkCount === 1 ? '' : 's'} loaded.`;
        }
    }

    // Must be called before any other await in a click or submit handler; Chrome only shows the
    // prompt during a user action. A denied request still lets the fetch try without the permission.
    function requestHostPermission(url) {
        return chrome.permissions.request(__helpers.toHostPermission(url)).catch(() => false);
    }

    function renderRemoteForm(isEditing) {
        const showView = savedRemoteURL && !isEditing;
        remoteView.hidden = !showView;
        remoteInputSection.hidden = showView;
        remoteCancelLink.hidden = !savedRemoteURL;
        remoteLink.href = savedRemoteURL;
        remoteLink.textContent = savedRemoteURL;
        remoteURLInput.value = savedRemoteURL;
    }

    async function initRemoteForm() {
        const { remoteGolinksURL = '', remoteGolinksSkipHeader = false } = await chrome.storage.local.get(["remoteGolinksURL", "remoteGolinksSkipHeader"]);
        savedRemoteURL = remoteGolinksURL;
        remoteSkipHeaderCheckbox.checked = remoteGolinksSkipHeader;
        remoteReloadLink.innerHTML = RELOAD_ICON;
        remoteEditLink.innerHTML = EDIT_ICON;
        remoteDeleteLink.innerHTML = DELETE_ICON;
        renderRemoteForm(false);
        renderRemoteStatus();
    }

    remoteReloadLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await requestHostPermission(savedRemoteURL);
        remoteStatus.classList.remove('remote-golinks--status-error');
        remoteStatus.textContent = 'Reloading remote golinks...';
        await chrome.runtime.sendMessage({ type: 'refreshRemoteGolinks' });
        // Unchanged remote golinks don't fire storage.onChanged, so the status is refreshed here
        renderRemoteStatus();
    });

    remoteSkipHeaderCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ remoteGolinksSkipHeader: remoteSkipHeaderCheckbox.checked });
    });

    remoteEditLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderRemoteForm(true);
        remoteURLInput.focus();
    });

    remoteCancelLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderRemoteForm(false);
    });

    remoteDeleteLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm(`Delete remote CSV URL '${savedRemoteURL}'?`)) {
            return;
        }
        await chrome.storage.local.remove("remoteGolinksURL");
        savedRemoteURL = '';
        renderRemoteForm(false);
    });

    remoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const value = remoteURLInput.value.trim();
        if (!value) {
            await chrome.storage.local.remove("remoteGolinksURL");
            savedRemoteURL = '';
            renderRemoteForm(false);
            return;
        }
        const url = __helpers.defaultToHTTPS(value);
        if (!__helpers.isValidURL(url)) {
            alert('Invalid URL. Protocol required (http:// or https://)');
            return;
        }
        await requestHostPermission(url);
        // Saving the same URL again leaves storage unchanged, so no refresh is triggered
        await chrome.storage.local.set({ remoteGolinksURL: url });
        savedRemoteURL = url;
        renderRemoteForm(false);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') {
            return;
        }
        if (changes.remoteGolinks) {
            rerenderTable();
        }
        if (changes.remoteGolinksURL || changes.remoteGolinks || changes.remoteGolinksError) {
            renderRemoteStatus();
        }
    });

    rerenderTable();
    renderSiteFooter();
    initRemoteForm();
});