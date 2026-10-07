const GOLINKS_TEMPLATE = { "gh": "https://github.com" };
const INDEX_GOLINK_NAME = "links";
const INVALID_GOLINK_NAME_CHARS = /[^a-zA-Z0-9/]/g;
const TRAILING_SLASHES = /\/+$/;
const XML_SPECIAL_CHARS = /[&<>"']/g;

chrome.runtime.onInstalled.addListener(async () => {
  const { golinks } = await chrome.storage.local.get("golinks");
  if (golinks) {
    return;
  }
  await chrome.storage.local.set({ golinks: GOLINKS_TEMPLATE });
  await chrome.tabs.update({ url: '/pages/help.html' });
});


// Suggestions can only be supplied after the first keystroke; until then only the default suggestion shows
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: getDefaultDescription("", {}) });
});


chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const query = toGolinkName(text);
  const { golinks = {} } = await chrome.storage.local.get("golinks");
  chrome.omnibox.setDefaultSuggestion({ description: getDefaultDescription(text, golinks) });
  const matches = Object.entries(golinks)
    .map(([name, url]) => ({ name, url, match: fuzzyMatch(query, name) }))
    .filter(({ match }) => match)
    .sort(compareMatches);
  suggest(matches.map(({ name, url, match }) => ({
    content: name,
    description: describeLink(highlightMatches(name, match.indices), url),
  })));
});


// Receives the selected suggestion's content, or the raw input when no suggestion is selected
chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const { golinks = {} } = await chrome.storage.local.get("golinks");
  const url = resolveGolinkURL(text, golinks);
  if (url) {
    return navigate(url, disposition);
  }
  const name = toGolinkName(text);
  if (!name || name === INDEX_GOLINK_NAME) {
    return navigate(chrome.runtime.getURL("pages/index.html"), disposition);
  }
  return navigate(chrome.runtime.getURL(`pages/create.html?name=${encodeURIComponent(name)}`), disposition);
});


// region Helpers

function compareMatches(a, b) {
  return b.match.score - a.match.score || a.name.length - b.name.length || a.name.localeCompare(b.name);
}

function describeLink(nameMarkup, url) {
  return `${nameMarkup} <dim>-</dim> <url>${escapeXML(url)}</url>`;
}

function escapeXML(str) {
  return str.replace(XML_SPECIAL_CHARS, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[char]));
}

// Subsequence match. Scores consecutive characters and segment starts higher, gaps lower.
// An empty query matches every name with score 0.
function fuzzyMatch(query, name) {
  const indices = [];
  let score = 0;
  let nameIndex = 0;

  for (const char of query) {
    const found = name.indexOf(char, nameIndex);

    if (found === -1) {
      return null;
    }
    if (found === 0 || name[found - 1] === "/") {
      score += 3;
    }
    if (indices.length > 0 && found === nameIndex) {
      score += 2;
    }

    score -= (found - nameIndex);
    indices.push(found);
    nameIndex = (found + 1);
  }

  return { score, indices };
}

function getDefaultDescription(text, golinks) {
  const url = resolveGolinkURL(text, golinks);
  if (url) {
    return describeLink(`<match>go ${escapeXML(text.trim())}</match>`, url);
  }

  const name = toGolinkName(text);
  if (!name) {
    return "Open golinks index, or type to search";
  }
  if (name === INDEX_GOLINK_NAME) {
    return "Open golinks index";
  }

  return `Create <match>go ${escapeXML(name)}</match>`;
}

function highlightMatches(name, indices) {
  const matched = new Set(indices);
  let result = "";
  let inMatch = false;
  for (let i = 0; i < name.length; i++) {
    const isMatch = matched.has(i);
    if (isMatch !== inMatch) {
      result += isMatch ? "<match>" : "</match>";
      inMatch = isMatch;
    }
    result += escapeXML(name[i]);
  }
  return inMatch ? `${result}</match>` : result;
}

function navigate(url, disposition) {
  if (disposition === "newForegroundTab") {
    return chrome.tabs.create({ url });
  }
  if (disposition === "newBackgroundTab") {
    return chrome.tabs.create({ url, active: false });
  }
  return chrome.tabs.update({ url });
}

// The longest "/"-separated prefix of the input that names a golink wins. The rest of the
// input, from its leading slash on, is appended to that golink's URL as typed.
function resolveGolinkURL(text, golinks) {
  const segments = text.trim().split("/");

  for (let i = segments.length; i > 0; i--) {
    const name = toGolinkName(segments.slice(0, i).join("/"));

    if (!Object.hasOwn(golinks, name)) {
      continue;
    }
    if (i === segments.length) {
      return golinks[name];
    }

    return `${golinks[name].replace(TRAILING_SLASHES, "")}/${segments.slice(i).join("/")}`;
  }

  return null;
}

// Mirrors __helpers.sanitizeGolinkName, which is unavailable in the service worker
function toGolinkName(text) {
  return text.trim().replace(INVALID_GOLINK_NAME_CHARS, "").toLowerCase();
}

// endregion
