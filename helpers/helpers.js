// Uses globalThis so the service worker can import this file too
if (globalThis.__helpers === undefined) {
    globalThis.__helpers = {
        isValidURL: function(url) {
            try {
                const parsed = new URL(url);
                return ['http:', 'https:'].includes(parsed.protocol);
            } catch (e) {
                return false;
            }
        },
        defaultToHTTPS: function(url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `https://${url}`;
            }
            return url;
        },
        isValidGolinkName: function(name) {
            return name.trim().length > 0;
        },
        sanitizeGolinkName: function(name) {
            return name.trim().toLowerCase();
        },
        // Each line is "name,url"; invalid lines are skipped
        parseGolinksCSV: function(csv) {
            const golinks = {};
            for (const line of csv.split(/\r?\n/)) {
                const [name, url] = line.split(',');
                const sanitizedName = globalThis.__helpers.sanitizeGolinkName(name);
                if (!globalThis.__helpers.isValidGolinkName(sanitizedName) || !globalThis.__helpers.isValidURL(url)) {
                    continue;
                }
                golinks[sanitizedName] = url;
            }
            return golinks;
        },
    };
}