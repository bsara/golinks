document.addEventListener('DOMContentLoaded', async function () {
    let content = '';
    const includeShared = new URLSearchParams(window.location.search).get('include') === 'all';
    const { golinks = {}, sharedGolinks = {} } = await chrome.storage.local.get(["golinks", "sharedGolinks"]);
    // Local golinks win over shared golinks with the same name
    const exportedGolinks = includeShared ? { ...sharedGolinks, ...golinks } : golinks;
    for (const [key, value] of Object.entries(exportedGolinks)) {
        content += `${key},${value}\n`;
    }
    document.querySelector('pre').textContent = content;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    downloadLink.download = 'golinks.csv';
    downloadLink.click();
});