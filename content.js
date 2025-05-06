// This content script is injected into all pages that match the patterns in manifest.json
console.log("Tab History Tracker content script loaded on:", window.location.href);

// Send a message to the background script to notify that this page has loaded
// This helps ensure we capture all tabs, even those opened directly or restored
chrome.runtime.sendMessage({
  action: "pageLoaded",
  url: window.location.href,
  title: document.title
});