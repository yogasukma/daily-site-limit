// Banner to show when time limit is exceeded
function createTimeLimitBanner(timeSpent, site) {
  // Format time as HH:MM
  const hours = Math.floor(timeSpent / 3600);
  const minutes = Math.floor((timeSpent % 3600) / 60);
  const timeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  try {
    // Remove existing banner if any
    const existingBanner = document.getElementById('time-limit-banner');
    if (existingBanner) {
      existingBanner.remove();
    }
    
    // Create banner element
    const banner = document.createElement('div');
    banner.id = 'time-limit-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background-color: #e74c3c;
      color: white;
      padding: 10px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      z-index: 2147483647;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    `;
    
    // Set banner content with text node first to avoid HTML injection issues
    const textContent = document.createTextNode(`You have already spent ${timeFormatted} on ${site}. Time limit exceeded!`);
    banner.appendChild(textContent);
    
    // Create close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      right: 50px;
      top: 8px;
      cursor: pointer;
      font-size: 20px;
    `;
    closeBtn.addEventListener('click', () => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
        document.body.style.marginTop = '0px';
      }
    });
    
    banner.appendChild(closeBtn);
    
    // Make sure the DOM is ready
    if (document.body) {
      // Add to page
      document.body.prepend(banner);
      
      // Push page content down to prevent banner from covering content
      document.body.style.marginTop = (banner.offsetHeight + 5) + 'px';
    }    } catch (error) {
      // Error silently handled
    }
  }

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showTimeLimitBanner') {
    createTimeLimitBanner(request.timeSpent, request.site);
    sendResponse({success: true});
  }
  return true;
});
