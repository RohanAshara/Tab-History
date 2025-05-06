// Track all tabs with their start times
let tabsData = {};

// Log when the active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const currentTime = Date.now();
  const tabId = activeInfo.tabId;
  
  // Save any previously active tab's data
  const previousActiveTab = Object.keys(tabsData).find(id => tabsData[id].isActive);
  if (previousActiveTab) {
    tabsData[previousActiveTab].isActive = false;
    await saveTabData(parseInt(previousActiveTab), tabsData[previousActiveTab].startTime, currentTime);
  }

  // If this is a new tab we haven't seen, initialize it
  if (!tabsData[tabId]) {
    tabsData[tabId] = {
      startTime: currentTime,
      isActive: true,
      lastUpdated: currentTime
    };
  } else {
    // If we've seen this tab before, update it
    tabsData[tabId].isActive = true;
    tabsData[tabId].startTime = currentTime;
    tabsData[tabId].lastUpdated = currentTime;
  }
  
  console.log(`Tab activated: ${tabId}, Start time: ${new Date(currentTime).toLocaleString()}`);
});

// Log when a tab is created
chrome.tabs.onCreated.addListener((tab) => {
  const tabId = tab.id;
  const currentTime = Date.now();
  
  // Initialize new tab data
  tabsData[tabId] = {
    startTime: currentTime,
    isActive: false, // It's not active until selected
    lastUpdated: currentTime
  };
  
  console.log(`Tab created: ${tabId}, URL: ${tab.url || 'about:blank'}`);
});

// Log when a tab is updated (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentTime = Date.now();
  
  // Only care about URL changes
  if (changeInfo.url) {
    // If we're tracking this tab already
    if (tabsData[tabId]) {
      // Save data for the previous URL
      saveTabData(tabId, tabsData[tabId].startTime, currentTime);
      
      // Update the start time for the new URL
      tabsData[tabId].startTime = currentTime;
      tabsData[tabId].lastUpdated = currentTime;
    } else {
      // Initialize this tab if we haven't seen it before
      tabsData[tabId] = {
        startTime: currentTime,
        isActive: false,
        lastUpdated: currentTime
      };
    }
    
    console.log(`Tab URL changed: ${tabId}, New URL: ${tab.url}, Time: ${new Date(currentTime).toLocaleString()}`);
  }
  
  // If the tab has completely loaded, make sure we add it to our tracking
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    if (!tabsData[tabId]) {
      tabsData[tabId] = {
        startTime: currentTime,
        isActive: false,
        lastUpdated: currentTime
      };
      console.log(`New tab loaded and tracked: ${tabId}, URL: ${tab.url}`);
    }
  }
});

// Log when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const currentTime = Date.now();
  
  if (tabsData[tabId]) {
    await saveTabData(tabId, tabsData[tabId].startTime, currentTime);
    delete tabsData[tabId];
    console.log(`Tab closed and saved: ${tabId}`);
  }
});

// Handle when the browser is closing
chrome.runtime.onSuspend.addListener(async () => {
  const currentTime = Date.now();
  
  // Save data for all tracked tabs
  const promises = Object.keys(tabsData).map(tabId => {
    return saveTabData(parseInt(tabId), tabsData[tabId].startTime, currentTime);
  });
  
  await Promise.all(promises);
  console.log("Browser closing, saved all tab data");
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pageLoaded" && sender.tab) {
    const tabId = sender.tab.id;
    const currentTime = Date.now();
    
    // If we're not already tracking this tab, start tracking it
    if (!tabsData[tabId]) {
      tabsData[tabId] = {
        startTime: currentTime,
        isActive: false, // We don't know if it's the active tab
        lastUpdated: currentTime,
        lastUrl: message.url,
        lastTitle: message.title
      };
      
      console.log(`Content script reported new tab: ${tabId}, URL: ${message.url}`);
    }
    
    // Check if this is the currently active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0 && tabs[0].id === tabId) {
        // This is the active tab
        tabsData[tabId].isActive = true;
        console.log(`Tab ${tabId} is active`);
      }
    });
    
    // Always acknowledge the message
    sendResponse({status: "received"});
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Periodically check all tabs to ensure we're tracking everything
function checkAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    const currentTime = Date.now();
    
    tabs.forEach(tab => {
      // Only track http/https URLs
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        if (!tabsData[tab.id]) {
          // We found a tab we're not tracking
          tabsData[tab.id] = {
            startTime: currentTime,
            isActive: false,
            lastUpdated: currentTime,
            lastUrl: tab.url,
            lastTitle: tab.title
          };
          
          console.log(`Found untracked tab during check: ${tab.id}, URL: ${tab.url}`);
        }
      }
    });
    
    // Check for active tab
    const activeTab = tabs.find(tab => tab.active);
    if (activeTab && tabsData[activeTab.id]) {
      // Set this tab as active and all others as inactive
      Object.keys(tabsData).forEach(id => {
        tabsData[id].isActive = (parseInt(id) === activeTab.id);
      });
    }
  });
}

// Run tab check initially and periodically
checkAllTabs();
setInterval(checkAllTabs, 60000); // Check every minute

// Function to save tab data to storage
async function saveTabData(tabId, startTimeValue, endTimeValue) {
  const duration = Math.floor((endTimeValue - startTimeValue) / 1000); // seconds
  
  // Don't save if duration is too short (less than 1 second)
  if (duration < 1) {
    return;
  }
  
  try {
    // Try to get tab information
    let tab = null;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch (e) {
      // Tab might have been closed
      console.log(`Tab ${tabId} not available, using cached data if possible`);
    }
    
    // Skip if we can't get the tab data and we don't have any cached URL
    if (!tab && (!tabsData[tabId] || !tabsData[tabId].lastUrl)) {
      return;
    }
    
    const url = tab ? tab.url : tabsData[tabId].lastUrl;
    const title = tab ? tab.title : tabsData[tabId].lastTitle || "Unknown";
    
    // Only save valid HTTP/HTTPS URLs
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      // Cache the URL and title in case the tab gets closed
      if (tabsData[tabId]) {
        tabsData[tabId].lastUrl = url;
        tabsData[tabId].lastTitle = title;
      }
      
      chrome.storage.local.get({ userHistory: [] }, (result) => {
        const history = result.userHistory;
        
        // Check if we already have an entry for this URL with the same start time
        // This helps avoid duplicate entries
        const existingEntryIndex = history.findIndex(entry => 
          entry.url === url && entry.visitedAt === new Date(startTimeValue).toLocaleString()
        );
        
        if (existingEntryIndex >= 0) {
          // Update existing entry with combined time
          const existingDuration = parseDuration(history[existingEntryIndex].timeSpent);
          const newDuration = existingDuration + duration;
          history[existingEntryIndex].timeSpent = formatDuration(newDuration);
          console.log(`Updated existing entry for ${url}, total time: ${formatDuration(newDuration)}`);
        } else {
          // Add new entry
          history.push({
            url: url,
            title: title,
            visitedAt: new Date(startTimeValue).toLocaleString(),
            timeSpent: formatDuration(duration)
          });
          console.log(`Added new entry for ${url}, time: ${formatDuration(duration)}`);
        }
        
        // Limit history size to prevent excessive storage usage (optional)
        if (history.length > 1000) {
          history.shift(); // Remove oldest entry
        }
        
        chrome.storage.local.set({ userHistory: history });
      });
    }
  } catch (error) {
    console.error("Error saving tab data:", error);
  }
}

// Parse duration string back to seconds
function parseDuration(durationStr) {
  let seconds = 0;
  
  if (durationStr.includes('hr')) {
    const hours = parseInt(durationStr.match(/(\d+) hr/)[1]);
    seconds += hours * 3600;
  }
  
  if (durationStr.includes('min')) {
    const minutes = parseInt(durationStr.match(/(\d+) min/)[1]);
    seconds += minutes * 60;
  }
  
  if (durationStr.includes('sec')) {
    const secs = parseInt(durationStr.match(/(\d+) sec/)[1]);
    seconds += secs;
  }
  
  return seconds;
}

// Format duration in a more readable format
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours} hr ${remainingMinutes} min ${remainingSeconds} sec`;
  }
}