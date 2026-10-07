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
        // A match pattern with no port matches every port. Google Sheets redirects to
        // googleusercontent.com, which needs its own permission or the redirected fetch hits CORS.
        toHostPermission: function(url) {
            const { protocol, hostname } = new URL(url);
            const origins = [`${protocol}//${hostname}/*`];
            if (hostname === 'docs.google.com') {
                origins.push('https://*.googleusercontent.com/*');
            }
            return { origins };
        },
        // Each line is "name,url"; invalid lines are skipped
        parseGolinksCSV: function(csv, skipFirstLine = false) {
            const golinks = {};
            const lines = csv.split(/\r?\n/);
            for (const line of skipFirstLine ? lines.slice(1) : lines) {
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