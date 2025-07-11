let activeTabUrl = null;
let timeSpent = {};

function normalizeUrl(url) {
  return url.replace(/^www\./, '');
}

// Initialize and check for daily reset
function initialize() {
  const today = new Date().toLocaleDateString();
  chrome.storage.local.get(['timeSpent', 'lastResetDate', 'notificationsSent'], (data) => {
    if (data.lastResetDate !== today) {
      timeSpent = {};
      chrome.storage.local.set({
        timeSpent: {},
        lastResetDate: today,
        notificationsSent: {}
      });
    } else {
      timeSpent = data.timeSpent || {};
    }
  });
}

initialize();

// Create an alarm that triggers every minute
chrome.alarms.create("timer", { periodInMinutes: 1 / 60 });

// Set/reset a daily alarm for midnight
function scheduleMidnightReset() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Next midnight
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();
  chrome.alarms.create('midnightReset', { when: Date.now() + msUntilMidnight });
}

// Call on startup
scheduleMidnightReset();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer" && activeTabUrl) {
    chrome.idle.queryState(60, (state) => {
      if (state === "active") {
        // ALWAYS read from storage first to ensure we have the latest state
        chrome.storage.local.get(['timeSpent', 'limits', 'notificationsSent'], (data) => {
          // Get fresh data from storage
          const freshTimeSpent = data.timeSpent || {};
          const limits = data.limits || {};
          const notificationsSent = data.notificationsSent || {};
          const today = new Date().toLocaleDateString();
          
          // Track the site if it exists in storage OR if it's a brand new site
          if (activeTabUrl in freshTimeSpent || !(activeTabUrl in freshTimeSpent)) {
            // For new sites, initialize to 0 first
            if (!(activeTabUrl in freshTimeSpent)) {
              freshTimeSpent[activeTabUrl] = 0;
            }
            
            // Update with increment
            freshTimeSpent[activeTabUrl] = freshTimeSpent[activeTabUrl] + 1;
            
            // Always set the in-memory timeSpent to match storage exactly
            timeSpent = freshTimeSpent;
            
            // Write back to storage immediately
            chrome.storage.local.set({ timeSpent: freshTimeSpent });

            // Check if time limit is exceeded
            if (limits[activeTabUrl]) {
              const limitInSeconds = limits[activeTabUrl] * 60;
              if (freshTimeSpent[activeTabUrl] >= limitInSeconds) {
                // Show notification only once per day
                if (notificationsSent[activeTabUrl] !== today) {
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icon.png'),
                    title: 'Time Limit Exceeded',
                    message: `You have spent over ${limits[activeTabUrl]} minutes on ${activeTabUrl}.`,
                    priority: 2
                  });
                  notificationsSent[activeTabUrl] = today;
                  chrome.storage.local.set({ notificationsSent });
                }
                // Always show the banner if limit is exceeded
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                  if (tabs[0] && normalizeUrl(new URL(tabs[0].url).hostname) === activeTabUrl) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: 'showTimeLimitBanner',
                      site: activeTabUrl,
                      timeSpent: freshTimeSpent[activeTabUrl]
                    });
                  }
                });
              }
            }
          }
        });
      }
    });
  }

  if (alarm.name === 'midnightReset') {
    // Reset all stats at midnight
    const today = new Date().toLocaleDateString();
    chrome.storage.local.set({
      timeSpent: {},
      lastResetDate: today,
      notificationsSent: {}
    }, () => {
      // Reschedule for next midnight
      scheduleMidnightReset();
    });
  }
});

function updateActiveTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url && tab.url.startsWith('http')) {
      const hostname = new URL(tab.url).hostname;
      if (hostname.includes('.')) {
        activeTabUrl = normalizeUrl(hostname);
      } else {
        activeTabUrl = null;
      }
    } else {
      activeTabUrl = null;
    }
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  updateActiveTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    updateActiveTab(tabId);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    activeTabUrl = null;
  } else {
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      if (tabs.length > 0) {
        updateActiveTab(tabs[0].id);
      }
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle reset time for specific site
  if (request.action === 'resetTimeSpent' && request.site) {
    // Define a function to completely reset the site
    const resetSiteCompletely = () => {
      chrome.storage.local.get(['timeSpent', 'notificationsSent'], (data) => {
        let storageTimeSpent = data.timeSpent || {};
        let storageNotifications = data.notificationsSent || {};
        
        // Delete from storage objects
        delete storageTimeSpent[request.site];
        delete storageNotifications[request.site];
        
        // Delete from memory
        delete timeSpent[request.site];
        
        // Save back to storage
        chrome.storage.local.set({
          timeSpent: storageTimeSpent,
          notificationsSent: storageNotifications
        }, () => {
          sendResponse({ success: true, message: 'Site completely reset' });
        });
      });
    };
    
    // Execute the reset
    resetSiteCompletely();
    return true; // Indicate async response
  }
  
  // This handler was removed - functionality consolidated in resetTimeSpent
  
  // Force reload of all time spent data (sync memory with storage)
  if (request.action === 'reloadTimeSpent') {
    chrome.storage.local.get('timeSpent', (data) => {
      // Completely replace the in-memory object with the storage version
      timeSpent = JSON.parse(JSON.stringify(data.timeSpent || {}));
      sendResponse({ success: true });
    });
    return true; // Indicate async response
  }
});