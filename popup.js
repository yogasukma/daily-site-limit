function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function normalizeUrl(url) {
  return url.replace(/^www\./, '');
}

function updateStatusTab(currentSite) {
  const statusDiv = document.getElementById('current-site-status');
  chrome.storage.local.get(['timeSpent', 'limits'], (data) => {
    const timeSpent = data.timeSpent ? data.timeSpent[currentSite] || 0 : 0;
    
    // Get limit, handling potential domain format differences
    let limit = 'Not set';
    const limits = data.limits || {};
    
    if (limits[currentSite] !== undefined) {
      limit = limits[currentSite];
    } else {
      // Try to find a match with slight variations in domain format
      for (const site in limits) {
        // Remove www, .com etc for comparison
        const simplifiedSite = site.replace(/^www\./, '').replace(/\.(com|net|org)$/, '');
        const simplifiedCurrent = currentSite.replace(/^www\./, '').replace(/\.(com|net|org)$/, '');
        
        if (simplifiedSite === simplifiedCurrent) {
          limit = limits[site];
          break;
        }
      }
    }
    
    // Format time as HH:MM
    const hours = Math.floor(timeSpent / 3600);
    const minutes = Math.floor((timeSpent % 3600) / 60);
    const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    statusDiv.innerHTML = `
      <p><strong>Current Site:</strong> ${currentSite}</p>
      <p><strong>Time Spent:</strong> ${timeFormatted}</p>
      <p><strong>Limit:</strong> ${limit !== 'Not set' ? limit + ' minutes' : 'Not set'}</p>
    `;
  });
}

function updateStatsTab() {
  const statsTable = document.getElementById('stats-table').getElementsByTagName('tbody')[0];
  chrome.storage.local.get('timeSpent', (data) => {
    const timeSpent = data.timeSpent || {};
    statsTable.innerHTML = '';
    // Sort sites by time spent descending
    const sortedSites = Object.entries(timeSpent)
      .sort((a, b) => b[1] - a[1]);
    for (const [site, time] of sortedSites) {
      let row = statsTable.insertRow();
      let siteCell = row.insertCell(0);
      let timeCell = row.insertCell(1);
      // Format time as HH:MM
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      siteCell.innerHTML = site;
      timeCell.innerHTML = timeFormatted;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tablinks');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      openTab(event, button.getAttribute('data-tab'));
    });
  });

  // Set default tab
  document.getElementsByClassName('tablinks')[0].click();

  // Status Tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      const currentSite = normalizeUrl(new URL(tabs[0].url).hostname);
      updateStatusTab(currentSite);

      const resetButton = document.getElementById('reset-time-button');
      resetButton.addEventListener('click', () => {
        if (confirm(`Reset time tracking for ${currentSite}?`)) {
          // Use the background script to handle everything
          chrome.runtime.sendMessage({ 
            action: 'resetTimeSpent', 
            site: currentSite 
          }, (response) => {
            if (response && response.success) {
              // Force an immediate UI refresh from storage
              chrome.storage.local.get(['timeSpent'], (data) => {
                // Update both tabs
                updateStatusTab(currentSite);
                updateStatsTab();
                
                alert(`Time tracking for ${currentSite} has been reset!`);
              });
            }
          });
        }
      });
    }
  });

  // Rules Tab
  const rulesTable = document.getElementById('rules-table').getElementsByTagName('tbody')[0];
  chrome.storage.local.get('limits', (data) => {
    const limits = data.limits || {};
    for (const site in limits) {
      let row = rulesTable.insertRow();
      let siteCell = row.insertCell(0);
      let limitCell = row.insertCell(1);
      let actionCell = row.insertCell(2);
      
      siteCell.innerHTML = site;
      limitCell.innerHTML = limits[site];
      
      // Create delete button
      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = 'x';
      deleteButton.className = 'delete-rule-btn';
      deleteButton.title = 'Delete rule';
      deleteButton.addEventListener('click', () => {
        if (confirm(`Delete rule for ${site}?`)) {
          chrome.storage.local.get('limits', (data) => {
            const currentLimits = data.limits || {};
            delete currentLimits[site];
            chrome.storage.local.set({ limits: currentLimits }, () => {
              if (chrome.runtime.lastError) {
                alert(`Error deleting rule: ${chrome.runtime.lastError.message}`);
                return;
              }
              // Show a brief success message before reloading
              row.style.backgroundColor = '#bd3535';
              row.style.transition = 'background-color 0.5s';
              setTimeout(() => {
                location.reload();
              }, 500);
            });
          });
        }
      });
      
      actionCell.appendChild(deleteButton);
    }
  });

  const limitForm = document.getElementById('limit-form');
  limitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let siteUrl = document.getElementById('site-url').value.trim();
    const timeLimit = document.getElementById('time-limit').value;
    
    // Make sure the URL is properly formatted
    try {
      // If the user entered a full URL with protocol
      if (siteUrl.includes('://')) {
        siteUrl = new URL(siteUrl).hostname;
      }
      // If it's just a domain, make sure it's properly normalized
      siteUrl = normalizeUrl(siteUrl);
    } catch (e) {
      // Just use as-is if there's any error
    }
    
    chrome.storage.local.get('limits', (data) => {
      const limits = data.limits || {};
      limits[siteUrl] = parseInt(timeLimit, 10); // Store as number
      chrome.storage.local.set({ limits }, () => {
        // Refresh the table and update the status tab
        location.reload();
      });
    });
  });

  // Stats Tab
  updateStatsTab();
});