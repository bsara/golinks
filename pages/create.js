document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form#create-edit');
    const nameInput = document.querySelector('input[name="name"]');
    const urlInput = document.querySelector('input[name="url"]');
    
    async function submitForm(e) {
        e.preventDefault();
        e.target.disabled = true;
        const formData = new FormData(form);
        const name = __helpers.sanitizeGolinkName(formData.get('name'));
        if (!__helpers.isValidGolinkName(name)) {
            alert('Name cannot be empty');
            return;
        }
        const url = __helpers.defaultToHTTPS(formData.get('url'));
        // Lightweight validation
        if (!__helpers.isValidURL(url)) {
            alert('Invalid URL. Protocol required (http:// or https://)');
            return;
        }
        const { golinks, remoteGolinks = {} } = await chrome.storage.local.get(["golinks", "remoteGolinks"]);
        if (Object.hasOwn(golinks || {}, name)) {
            alert(`A personal link named '${name}' already exists: ${golinks[name]}`);
            return;
        }
        if (Object.hasOwn(remoteGolinks, name)
            && !confirm(`A remote link named '${name}' already exists: ${remoteGolinks[name]}\n\nCreating this personal link will override it. Continue?`)) {
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

    form.addEventListener('submit', submitForm);
    initForm();
});