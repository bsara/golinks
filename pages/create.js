document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form#create-edit');
    const nameInput = document.querySelector('input[name="name"]');
    const urlInput = document.querySelector('input[name="url"]');
    const createSharedButton = document.querySelector('#create-shared');
    
    // Alerts and returns null when the form is invalid
    function getValidatedFormValues({ isURLRequired = true } = {}) {
        const formData = new FormData(form);
        const name = __helpers.sanitizeGolinkName(formData.get('name'));
        if (!__helpers.isValidGolinkName(name)) {
            alert('Name cannot be empty');
            return null;
        }
        const rawURL = formData.get('url').trim();
        if (!rawURL && !isURLRequired) {
            return { name, url: '' };
        }
        const url = __helpers.defaultToHTTPS(rawURL);
        // Lightweight validation
        if (!__helpers.isValidURL(url)) {
            alert('Invalid URL. Protocol required (http:// or https://)');
            return null;
        }
        return { name, url };
    }

    async function submitForm(e) {
        e.preventDefault();
        e.target.disabled = true;
        const values = getValidatedFormValues();
        if (!values) {
            return;
        }
        const { name, url } = values;
        const { golinks, sharedGolinks = {} } = await chrome.storage.local.get(["golinks", "sharedGolinks"]);
        if (Object.hasOwn(golinks || {}, name)) {
            alert(`A personal link named '${name}' already exists: ${golinks[name]}`);
            return;
        }
        if (Object.hasOwn(sharedGolinks, name)
            && !confirm(`A shared link named '${name}' already exists: ${sharedGolinks[name]}\n\nCreating this personal link will override it. Continue?`)) {
            return;
        }
        const newGolinks = { ...golinks, [name]: url };

        await chrome.storage.local.set({ golinks: newGolinks });
        e.target.disabled = false;
        chrome.tabs.update({ url: "/pages/index.html" });
    }

    async function initForm() {
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        if (!name) {
            return;
        }
        nameInput.value = name.toLowerCase();
        const { golinks } = await chrome.storage.local.get("golinks");
        if (golinks[name]) {
            urlInput.value = golinks[name];
        }
    }

    async function initCreateSharedButton() {
        const { sharedGolinksURL, sharedGolinksCreateURLTemplate } = await chrome.storage.local.get(["sharedGolinksURL", "sharedGolinksCreateURLTemplate"]);
        if (!sharedGolinksURL) {
            createSharedButton.title = 'No shared CSV URL set';
        } else if (!sharedGolinksCreateURLTemplate) {
            createSharedButton.title = 'Shared link creation not configured';
        } else {
            createSharedButton.disabled = false;
        }
    }

    async function createSharedLink() {
        const values = getValidatedFormValues({ isURLRequired: false });
        if (!values) {
            return;
        }
        const { sharedGolinksCreateURLTemplate } = await chrome.storage.local.get("sharedGolinksCreateURLTemplate");
        chrome.tabs.update({ url: __helpers.fillURLTemplate(sharedGolinksCreateURLTemplate, values.name, values.url) });
    }

    form.addEventListener('submit', submitForm);
    createSharedButton.addEventListener('click', createSharedLink);
    initForm();
    initCreateSharedButton();
});