const EDIT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
const RELOAD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-cw"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
const DELETE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

document.addEventListener('DOMContentLoaded', function () {
    const table = document.querySelector('.golink-table tbody');
    const siteFooter = document.querySelector('.site-footer');
    const golinkCountLabel = document.querySelector('.golink-home--count');
    const sharedForm = document.querySelector('form#shared-golinks');
    const sharedURLInput = sharedForm.querySelector('input[name="url"]');
    const sharedStatus = sharedForm.querySelector('.shared-golinks--status');
    const sharedView = sharedForm.querySelector('.shared-golinks--view');
    const sharedLink = sharedForm.querySelector('.shared-golinks--link');
    const sharedReloadLink = sharedForm.querySelector('.shared-golinks--reload');
    const sharedEditLink = sharedForm.querySelector('.shared-golinks--edit');
    const sharedDeleteLink = sharedForm.querySelector('.shared-golinks--delete');
    const sharedInputSection = sharedForm.querySelector('.shared-golinks--input');
    const sharedCancelLink = sharedForm.querySelector('.shared-golinks--cancel');
    const sharedSkipHeaderCheckbox = sharedForm.querySelector('input[name="skipHeader"]');
    const sharedConfigureCreateButton = sharedForm.querySelector('.shared-golinks--configure-create');
    const sharedCreateDialog = document.querySelector('.shared-create-dialog');
    const sharedCreateForm = sharedCreateDialog.querySelector('form#shared-create');
    const sharedCreateURLTemplateInput = sharedCreateForm.querySelector('input[name="urlTemplate"]');
    const sharedCreateOnUnknownCheckbox = sharedCreateForm.querySelector('input[name="createOnUnknown"]');
    const sharedCreateCancelLink = sharedCreateForm.querySelector('.shared-create-dialog--cancel');
    const sharedCreateDeleteButton = sharedCreateForm.querySelector('.shared-create-dialog--delete');
    const exportLink = document.querySelector('.golink-home--export');
    const exportSharedLinks = document.querySelector('.golink-home--export-shared');
    const filterInput = document.querySelector('.golink-table--filter');
    let savedSharedURL = '';

    function applyFilter() {
        const query = filterInput.value.trim().toLocaleLowerCase();
        table.querySelectorAll('.golink-row').forEach(row => {
            const name = row.cells[0].textContent.toLocaleLowerCase();
            const url = row.cells[1].textContent.toLocaleLowerCase();
            row.hidden = Boolean(query) && !name.includes(query) && !url.includes(query);
        });
    }

    filterInput.addEventListener('input', applyFilter);

    async function rerenderTable() {
        table.querySelectorAll('.golink-row').forEach(row => row.remove());

        const { golinks, sharedGolinks = {} } = await chrome.storage.local.get(["golinks", "sharedGolinks"]);
        const localEntries = Object.entries(golinks || {}).map(([key, value]) => [key, value, false]);
        const sharedEntries = Object.entries(sharedGolinks).map(([key, value]) => [key, value, true]);

        // Alphabetical by name; a local golink comes before the shared golink it overrides
        const entries = [...localEntries, ...sharedEntries]
            .sort(([keyA, , isSharedA], [keyB, , isSharedB]) => keyA.localeCompare(keyB) || isSharedA - isSharedB);

        const totalGolinkCount = Object.keys({ ...sharedGolinks, ...golinks }).length;
        golinkCountLabel.textContent = `${totalGolinkCount} link${totalGolinkCount === 1 ? '' : 's'}`;

        for (let [key, value, isShared] of entries) {
            const row = table.insertRow();
            row.className = 'golink-row';

            const nameCell = row.insertCell();
            nameCell.textContent = key;
            if (isShared && Object.hasOwn(golinks || {}, key)) {
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

            if (isShared) {
                const sharedLabel = document.createElement('span');
                sharedLabel.className = 'golink-row--shared';
                sharedLabel.textContent = 'shared';
                actionsCell.appendChild(sharedLabel);
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

        applyFilter();

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

    async function renderSharedStatus() {
        const { sharedGolinksURL, sharedGolinks, sharedGolinksError } = await chrome.storage.local.get(["sharedGolinksURL", "sharedGolinks", "sharedGolinksError"]);
        sharedStatus.classList.toggle('shared-golinks--status-error', Boolean(sharedGolinksURL && sharedGolinksError));
        if (!sharedGolinksURL) {
            sharedStatus.textContent = '';
        } else if (sharedGolinksError) {
            sharedStatus.textContent = `Failed to load shared golinks: ${sharedGolinksError}`;
        } else if (sharedGolinks === undefined) {
            sharedStatus.textContent = 'Loading shared golinks...';
        } else {
            const sharedGolinkCount = Object.keys(sharedGolinks).length;
            sharedStatus.textContent = `${sharedGolinkCount} shared link${sharedGolinkCount === 1 ? '' : 's'} loaded.`;
        }
    }

    // Must be called before any other await in a click or submit handler; Chrome only shows the
    // prompt during a user action. A denied request still lets the fetch try without the permission.
    function requestHostPermission(url) {
        return chrome.permissions.request(__helpers.toHostPermission(url)).catch(() => false);
    }

    function renderSharedForm(isEditing) {
        const showView = savedSharedURL && !isEditing;
        sharedView.hidden = !showView;
        sharedInputSection.hidden = showView;
        sharedCancelLink.hidden = !savedSharedURL;
        sharedConfigureCreateButton.hidden = !savedSharedURL;
        exportLink.hidden = Boolean(savedSharedURL);
        exportSharedLinks.hidden = !savedSharedURL;
        sharedLink.href = savedSharedURL;
        sharedLink.textContent = savedSharedURL;
        sharedURLInput.value = savedSharedURL;
    }

    async function renderSharedConfigureCreateButton() {
        const { sharedGolinksCreateURLTemplate } = await chrome.storage.local.get("sharedGolinksCreateURLTemplate");
        sharedConfigureCreateButton.value = `${sharedGolinksCreateURLTemplate ? 'Configure' : 'Add'} Shared Link Creation`;
    }

    async function initSharedForm() {
        const { sharedGolinksURL = '', sharedGolinksSkipHeader = false } = await chrome.storage.local.get(["sharedGolinksURL", "sharedGolinksSkipHeader"]);
        savedSharedURL = sharedGolinksURL;
        sharedSkipHeaderCheckbox.checked = sharedGolinksSkipHeader;
        sharedReloadLink.innerHTML = RELOAD_ICON;
        sharedEditLink.innerHTML = EDIT_ICON;
        sharedDeleteLink.innerHTML = DELETE_ICON;
        renderSharedForm(false);
        renderSharedStatus();
        renderSharedConfigureCreateButton();
    }

    sharedReloadLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await requestHostPermission(savedSharedURL);
        sharedStatus.classList.remove('shared-golinks--status-error');
        sharedStatus.textContent = 'Reloading shared golinks...';
        await chrome.runtime.sendMessage({ type: 'refreshSharedGolinks' });
        // Unchanged shared golinks don't fire storage.onChanged, so the status is refreshed here
        renderSharedStatus();
    });

    sharedSkipHeaderCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ sharedGolinksSkipHeader: sharedSkipHeaderCheckbox.checked });
    });

    sharedEditLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderSharedForm(true);
        sharedURLInput.focus();
    });

    sharedCancelLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderSharedForm(false);
    });

    sharedDeleteLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm(`Delete shared CSV URL '${savedSharedURL}'?`)) {
            return;
        }
        await chrome.storage.local.remove("sharedGolinksURL");
        savedSharedURL = '';
        renderSharedForm(false);
    });

    sharedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const value = sharedURLInput.value.trim();
        if (!value) {
            await chrome.storage.local.remove("sharedGolinksURL");
            savedSharedURL = '';
            renderSharedForm(false);
            return;
        }
        const url = __helpers.defaultToHTTPS(value);
        if (!__helpers.isValidURL(url)) {
            alert('Invalid URL. Protocol required (http:// or https://)');
            return;
        }
        await requestHostPermission(url);
        // Saving the same URL again leaves storage unchanged, so no refresh is triggered
        await chrome.storage.local.set({ sharedGolinksURL: url });
        savedSharedURL = url;
        renderSharedForm(false);
    });

    sharedConfigureCreateButton.addEventListener('click', async () => {
        const { sharedGolinksCreateURLTemplate = '', sharedGolinksCreateOnUnknown = false } = await chrome.storage.local.get(["sharedGolinksCreateURLTemplate", "sharedGolinksCreateOnUnknown"]);
        sharedCreateURLTemplateInput.value = sharedGolinksCreateURLTemplate;
        sharedCreateOnUnknownCheckbox.checked = sharedGolinksCreateOnUnknown;
        sharedCreateDeleteButton.hidden = !sharedGolinksCreateURLTemplate;
        sharedCreateDialog.showModal();
    });

    sharedCreateCancelLink.addEventListener('click', (e) => {
        e.preventDefault();
        sharedCreateDialog.close();
    });

    sharedCreateDeleteButton.addEventListener('click', async () => {
        if (!confirm('Delete shared link creation URL?')) {
            return;
        }
        await chrome.storage.local.remove(["sharedGolinksCreateURLTemplate", "sharedGolinksCreateOnUnknown"]);
        sharedCreateDialog.close();
    });

    sharedCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlTemplate = __helpers.defaultToHTTPS(sharedCreateURLTemplateInput.value.trim());
        if (!__helpers.isValidURL(__helpers.fillURLTemplate(urlTemplate, 'name', 'https://example.com'))) {
            alert('Invalid URL. Protocol required (http:// or https://)');
            return;
        }
        await chrome.storage.local.set({
            sharedGolinksCreateURLTemplate: urlTemplate,
            sharedGolinksCreateOnUnknown: sharedCreateOnUnknownCheckbox.checked,
        });
        sharedCreateDialog.close();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') {
            return;
        }
        if (changes.sharedGolinks) {
            rerenderTable();
        }
        if (changes.sharedGolinksURL || changes.sharedGolinks || changes.sharedGolinksError) {
            renderSharedStatus();
        }
        if (changes.sharedGolinksCreateURLTemplate) {
            renderSharedConfigureCreateButton();
        }
    });

    rerenderTable();
    renderSiteFooter();
    initSharedForm();
});