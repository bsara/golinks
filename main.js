import "./helpers/helpers.js";

const GOLINKS_TEMPLATE = { "gh": "https://github.com" };
const INDEX_GOLINK_NAMES = ["links", "/"];
const REMOTE_REFRESH_ALARM = "refreshRemoteGolinks";
const REMOTE_REFRESH_MINUTES = 60;
const TRAILING_SLASHES = /\/+$/;
const XML_SPECIAL_CHARS = /[&<>"']/g;

chrome.runtime.onInstalled.addListener(async () => {
  startRemoteRefresh();
  const { golinks } = await chrome.storage.local.get("golinks");
  if (golinks) {
    return;
  }
  await chrome.storage.local.set({ golinks: GOLINKS_TEMPLATE });
  await chrome.tabs.update({ url: '/pages/help.html' });
});


chrome.runtime.onStartup.addListener(() => startRemoteRefresh());


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REMOTE_REFRESH_ALARM) {
    refreshRemoteGolinks();
  }
});


chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }
  if (changes.remoteGolinksSkipHeader && !changes.remoteGolinksURL) {
    return refreshRemoteGolinks();
  }
  if (!changes.remoteGolinksURL) {
    return;
  }
  // Drops the previous URL's golinks so they don't linger if the new URL fails
  await chrome.storage.local.remove(["remoteGolinks", "remoteGolinksError"]);
  refreshRemoteGolinks();
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "refreshRemoteGolinks") {
    return;
  }
  refreshRemoteGolinks().then(() => sendResponse());
  // Keeps the message channel open until sendResponse is called
  return true;
});


// Suggestions can only be supplied after the first keystroke; until then only the default suggestion shows
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: getDefaultDescription("", {}) });
});


chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const query = __helpers.sanitizeGolinkName(text);
  const golinks = await getGolinks();
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
  const golinks = await getGolinks();
  const url = resolveGolinkURL(text, golinks);
  if (url) {
    return navigate(url, disposition);
  }
  const name = __helpers.sanitizeGolinkName(text);
  if (!name || INDEX_GOLINK_NAMES.includes(name)) {
    return navigate(chrome.runtime.getURL("pages/index.html"), disposition);
  }
  const remoteCreateURL = await getRemoteCreateURL(name);
  return navigate(remoteCreateURL || chrome.runtime.getURL(`pages/create.html?name=${encodeURIComponent(name)}`), disposition);
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

// Local golinks win over remote golinks with the same name
async function getGolinks() {
  const { golinks = {}, remoteGolinks = {} } = await chrome.storage.local.get(["golinks", "remoteGolinks"]);
  return { ...remoteGolinks, ...golinks };
}

// Matches the create page, which only allows remote link creation when a remote CSV URL is also set
async function getRemoteCreateURL(name) {
  const { remoteGolinksURL, remoteGolinksCreateURLTemplate, remoteGolinksCreateOnUnknown } = await chrome.storage.local.get(["remoteGolinksURL", "remoteGolinksCreateURLTemplate", "remoteGolinksCreateOnUnknown"]);
  if (!remoteGolinksURL || !remoteGolinksCreateURLTemplate || !remoteGolinksCreateOnUnknown) {
    return null;
  }
  return __helpers.fillURLTemplate(remoteGolinksCreateURLTemplate, name, '');
}

function getDefaultDescription(text, golinks) {
  const url = resolveGolinkURL(text, golinks);
  if (url) {
    return describeLink(`<match>go ${escapeXML(text.trim())}</match>`, url);
  }

  const name = __helpers.sanitizeGolinkName(text);
  if (!name) {
    return "Open golinks index, or type to search";
  }
  if (INDEX_GOLINK_NAMES.includes(name)) {
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

// Failed fetches keep the cached remote golinks and record the error for the options page
async function refreshRemoteGolinks() {
  const { remoteGolinksURL, remoteGolinksSkipHeader = false } = await chrome.storage.local.get(["remoteGolinksURL", "remoteGolinksSkipHeader"]);
  if (!remoteGolinksURL) {
    return;
  }

  try {
    // Credentials are only sent with host permission; without it CORS applies, and servers that
    // allow any origin ("*") reject credentialed requests
    const hasHostPermission = await chrome.permissions.contains(__helpers.toHostPermission(remoteGolinksURL));
    const response = await fetch(remoteGolinksURL, { credentials: hasHostPermission ? "include" : "same-origin" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const remoteGolinks = __helpers.parseGolinksCSV(await response.text(), remoteGolinksSkipHeader);
    await chrome.storage.local.set({ remoteGolinks });
    await chrome.storage.local.remove("remoteGolinksError");
  } catch (error) {
    await chrome.storage.local.set({ remoteGolinksError: error.message });
  }
}

// The longest "/"-separated prefix of the input that names a golink wins. The rest of the
// input, from its leading slash on, is appended to that golink's URL as typed.
function resolveGolinkURL(text, golinks) {
  const segments = text.trim().split("/");

  for (let i = segments.length; i > 0; i--) {
    const name = __helpers.sanitizeGolinkName(segments.slice(0, i).join("/"));

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

// Fires right away, then on an interval. Re-created on each start because Chrome may clear alarms on restart.
function startRemoteRefresh() {
  chrome.alarms.create(REMOTE_REFRESH_ALARM, { when: Date.now(), periodInMinutes: REMOTE_REFRESH_MINUTES });
}

// endregion
