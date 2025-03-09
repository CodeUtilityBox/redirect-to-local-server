// DOM Elements
const enableToggle = document.querySelector('.enable-toggle');
const redirectWrapper = document.getElementById('redirectWrapper');
const formButton = document.getElementById('toggleButton');
const addRedirectButton = document.getElementById('addRedirect');
const fromUrlInput = document.getElementById('fromUrl');
const toUrlInput = document.getElementById('toUrl');
const methodSelect = document.getElementById('methodSelect');
const redirectList = document.getElementById('redirectList');
const reSyncRedirects = document.getElementById('disableAllBtn');
const status = document.getElementById('status');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');

// Step 1: Extract extensionId from the URL
const urlParams = new URLSearchParams(window.location.search);
const extensionId = urlParams.get('extension_id'); // Get the extensionId from the URL parameter
!extensionId && alert("Extension ID not found in the URL, close and reopen the extension !!");


// Redirects Data
let localRedirects = [];
let updatingRuleId = null;
let search = '';


// Get the search 
searchInput.addEventListener('input', () => {
  search = searchInput.value.toLowerCase().trim();
  refreshPage('search');
});

// Toggle Redirect Form Visibility
formButton.addEventListener('click', () => {
  redirectWrapper.classList.toggle('visible');
  // Update the button text based on visibility
  formButton.textContent = redirectWrapper.classList.contains('visible') ? '−' : '+';
  if (formButton.textContent == '+') {
    fromUrlInput.value = '';
    toUrlInput.value = '';
    methodSelect.value = 'GET';
    updatingRuleId = null;
  }
});

function updateMainToggle(status) {
  const mainToggle = document.getElementById('main-toggle');
  const switchText = mainToggle.parentElement.querySelector('.switch-text');
  mainToggle.checked = status == 'ON' ? true : false;
  //mainToggle.checked && showToast('Extension is in Listening mode !', 3000, 'success');
  switchText.textContent = status || 'OFF';
}

// Render Redirect List
function renderRedirectList(redirects) {
  const redirectList = document.getElementById('redirectList');
  redirectList.innerHTML = ''; // Clear existing list
  redirects.forEach((redirect) => {
    const method = redirect.method || 'GET'; // Default to GET if method is undefined
    const methodClass = `method-${method.toLowerCase()}`; // Generate class for method badge

    // Create list item
    const li = document.createElement('li');
    li.className = 'redirect-item';
    li.innerHTML = `
          <div class="redirect-item-content">
              <div class="redirect-details">
                  <strong style="font-size: 15px;" >From:</strong>
                  <span class="small-input">${redirect.from}</span>
                  <br>
                  <strong style="font-size: 15px;">To&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</strong>
                  <span class="small-input">${redirect.to}</span>
              </div>
              <div class="action-container">
              <span class="method-badge ${methodClass}">${method}</span>
                  <label class="switch">
                      <input type="checkbox" class="enable-toggle" ${redirect.enabled ? 'checked' : ''} data-rule-id="${redirect.redirectRuleId}">
                      <span class="slider round">
                          <span class="switch-text">${redirect.enabled ? 'ON' : 'OFF'}</span>
                      </span>
                  </label>

                  <button class="edit-btn" data-rule-id="${redirect.redirectRuleId}">Edit</button>
                  <button class="delete-btn" data-rule-id="${redirect.redirectRuleId}">Delete</button>
              </div>
          </div>
          <hr>
      `;

    // Append the list item to the redirect list
    redirectList.appendChild(li);

    // Add event listeners for toggle, edit, and delete buttons
    const checkbox = li.querySelector('.enable-toggle');
    const switchText = li.querySelector('.switch-text');

    checkbox.addEventListener('change', (event) => {
      const ruleId = event.target.getAttribute('data-rule-id');
      const isEnabled = event.target.checked;
      switchText.textContent = isEnabled ? 'ON' : 'OFF';
      handleEnableToggle(ruleId, isEnabled); // Pass ruleId and isEnabled to the handler
    });

    const editButton = li.querySelector('.edit-btn');
    const deleteButton = li.querySelector('.delete-btn');

    editButton.addEventListener('click', () => {
      const ruleId = editButton.getAttribute('data-rule-id');
      editRedirect(ruleId); // Pass ruleId to the edit function
    });

    deleteButton.addEventListener('click', () => {
      const ruleId = deleteButton.getAttribute('data-rule-id');
      deleteRedirect(ruleId); // Pass ruleId to the delete function
    });

  });
}

// Edit Redirect
function editRedirect(ruleId) {

  updatingRuleId = ruleId;
  // Step 1: Find the redirect rule by ruleId
  const redirect = localRedirects.find((r) => r.redirectRuleId == ruleId);

  if (!redirect) {
    alert("Ridirect rule not found in cache, refresh the page !!");
    //return;
  }
  // Step 2: Populate the form fields with the redirect data
  fromUrlInput.value = redirect.from;
  toUrlInput.value = redirect.to;
  methodSelect.value = redirect.method;

  // Step 4: Update the "Add Redirect" button to act as an "Update Redirect" button
  addRedirectButton.textContent = 'UPDATE REDIRECT';
  addRedirectButton.dataset.ruleId = ruleId; // Store the ruleId in the button for later use

  // Step 5: Show the form if it's hidden
  redirectWrapper.classList.add('visible');
  formButton.textContent = '−';
}

// Delete Redirect
function deleteRedirect(ruleId) {
  chrome.runtime.sendMessage(extensionId, { action: 'DeleteRedirect', ruleId }, (res) => {
    refreshPage();
    showToast('Deleted the API successfully!', 3000, 'success');
  });
}

// Toggle Redirect Enable/Disable
function handleEnableToggle(ruleId, status) {
  chrome.runtime.sendMessage(extensionId, { action: 'EnableDisableRedirect', ruleId, status }, (res) => {
    refreshPage();
  });
}


// Load Saved Redirects and Extension State
async function refreshPage(source) {

  !extensionId && alert("Extension ID not found in the URL, close and reopen the extension !!");

  // Step 2: Send a message to the extension to get all data
  chrome.runtime.sendMessage(extensionId, { action: 'GetAllData', search }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error communicating with extension:', chrome.runtime.lastError.message);
      return;
    }
    // Step 3: Render the redirect list with the received data
    const redirects = response?.redirects || [];
    renderRedirectList(redirects);
    updateMainToggle(response?.onOff?.[0]);
    //reset local values
    if (source != 'search') {
      addRedirectButton.textContent = 'ADD REDIRECT';
      updatingRuleId = null;
      localRedirects = redirects;
    }
  });
}

//ReSyncRedirects actions
reSyncRedirects.addEventListener('click', () => {
  chrome.runtime.sendMessage(extensionId, { action: 'ReSyncRedirects' }, (res) => {
    refreshPage();
    showToast('Re-Synced all APIs successfully!', 3000, 'success');
  });
});

// Add Redirect
addRedirectButton.addEventListener('click', async () => {

  if (false == await validations()) {
    return;
  }

  const fromUrl = fromUrlInput.value.trim();
  const toUrl = toUrlInput.value.trim();
  const method = methodSelect.value;
  const ruleId = localRedirects.find(r => r.redirectRuleId == updatingRuleId) ? updatingRuleId : null;

  chrome.runtime.sendMessage(extensionId, { action: 'AddRedirect', fromUrl, toUrl, method, ruleId }, (res) => {
    fromUrlInput.value = '';
    toUrlInput.value = '';
    methodSelect.value = 'GET';
    ruleId ? showToast('Redirect updated successfully!', 3000, 'success') : showToast('Redirect added successfully!', 3000, 'success');
    if (search) showToast('FYI - Search filter is applied', 3000, 'info');
    refreshPage();
  });

});

//main toggle actions test
document.getElementById('main-toggle').addEventListener('change', (event) => {
  const isChecked = event.target.checked;
  const status = isChecked ? 'ON' : 'OFF';
  chrome.runtime.sendMessage(extensionId, { action: 'EnableDisableExtension', status }, (res) => {
    refreshPage();
  });
});

function showToast(message, duration = 3000, color = 'info') {
  // Create the toast element
  const toast = document.createElement('div');
  toast.className = `toast ${color}`;
  toast.textContent = message;

  // Append the toast to the container
  const toastContainer = document.getElementById('toast-container');
  toastContainer.appendChild(toast);

  // Slide in the toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Remove the toast after the specified duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300); // Wait for the fade-out animation to complete
  }, duration);
}


async function validations() {

  const fromUrl = fromUrlInput.value;
  const toUrl = toUrlInput.value;
  const method = methodSelect.value;


  if (!isValidUrl(fromUrl) || !isValidUrl(toUrl)) {
    showToast('Please enter valid URLs', 3000, 'error')
    return false;
  }
  if (!isValidHostname(fromUrl) || !isValidHostname(toUrl)) {
    showToast('URLs must contain a hostname', 3000, 'error')
    return false;
  }

  if (fromUrl.toLowerCase() == toUrl.toLowerCase()) {
    showToast('Please enter distinct URLs', 3000, 'error')
    return false;
  }
  if (!hasSameNumberOfHashes(fromUrl, toUrl)) {
    showToast('Placeholder # must be same in both URLs', 3000, 'error')
    return false;
  }
  if (!updatingRuleId && localRedirects.find(e => e.from === fromUrl && e.method == method)) {
    showToast('Redirect already exists', 3000, 'error')
    return false;
  }

  return true;

}

function hasSameNumberOfHashes(str1, str2) {
  const countHashes = str => (str.match(/#/g) || []).length;
  return countHashes(str1) === countHashes(str2);
}

function isValidHostname(url) {
  try {
    const url2 = new URL(url);
    return !!url2.hostname; // Ensure the hostname is valid
  } catch {
    return false; // Return false if an error is thrown
  }
}

function isValidUrl(url) {
  try {
    const url2 = new URL(url);
    return !!url2.href; // Ensure the URL is valid
  } catch {
    return false; // Return false if an error is thrown
  }
}

function askToInstallExtn() {
  // Step 1: Extract extensionId from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const extensionId = urlParams.get('extnId'); // Get the extensionId from the URL parameter

  if (!extensionId) {
    // Create the popup
    const popupContainer = document.createElement('div');
    popupContainer.id = 'extensionPopupContainer';

    // Popup content
    popupContainer.innerHTML = `
        <h3>Extension Required</h3>
        <p>Extension not installed. Please install it first.</p>
        <a href="https://chromewebstore.google.com/detail/redirect-to-local-server/mcckhgbpcjcfdmnmbahhoakjlnmmjjgo" target="_blank" class="download-extension-link">Install Extension</a>
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'extensionOverlay';

    // Append popup and overlay to the body
    document.body.appendChild(overlay);
    document.body.appendChild(popupContainer);

    // Display the popup and overlay
    popupContainer.style.display = 'block';
    overlay.style.display = 'block';
  }
}


// Initialize
refreshPage();

