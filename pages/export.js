document.addEventListener('DOMContentLoaded', async function () {
    let content = '';
    const includeRemote = new URLSearchParams(window.location.search).get('include') === 'all';
    const { golinks = {}, remoteGolinks = {} } = await chrome.storage.local.get(["golinks", "remoteGolinks"]);
    // Local golinks win over remote golinks with the same name
    const exportedGolinks = includeRemote ? { ...remoteGolinks, ...golinks } : golinks;
    for (const [key, value] of Object.entries(exportedGolinks)) {
        content += `${key},${value}\n`;
    }
    document.querySelector('pre').textContent = content;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    downloadLink.download = 'golinks.csv';
    downloadLink.click();
});