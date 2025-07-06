// Background script to handle saving the text and make API calls to server.
const PROMPTVAULT_API_URL = 'http://localhost:3000'

// This is the main function that will be called when a message is received.
const saveToVault = async (payload) => {
    try {
        console.log("Attempting to get auth token...");

        // Get the session cookie from the browser for your app's domain.
        const cookie = await chrome.cookies.get({
            url: PROMPTVAULT_API_URL,
            name: '__session', // This is default name for Clerk's session cookie
        });

        if (!cookie) {
            console.error('Authentication cookie not found. Opening login page for user.');
            // Open the login page in a new tab so the user can sign in
            chrome.tabs.create({ url: `${PROMPTVAULT_API_URL}/` });
            return { success: false, message: 'You are not logged in. Please sign in to PromptVault and try again.' };
        }

        const token = cookie.value; // The cookie's value *is* the JWT token

        // Make the authenticated API call to backend
        const response = await fetch(`${PROMPTVAULT_API_URL}/api/save-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        // Check if the response is actually JSON before trying to parse it.
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            // If not, we assume auth failed and we received an HTML page.
            console.error("Authentication failed or server sent non-JSON response. Opening login page.");
            chrome.tabs.create({ url: `${PROMPTVAULT_API_URL}/` });
            return { success: false, message: `Failed to save: ${response.statusText}` };
        }

        const result = await response.json();

        // if (response.ok) {
        chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon128.png', title: 'PromptVault', message: `Chat "${result.prompt.title}" saved successfully!` });

        chrome.tabs.query({ url: `${PROMPTVAULT_API_URL}/*` }, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.reload(tab.id);
                }
            });
        });

        return { success: true, message: "Chat saved successfully!" };
        // } else {
        // return { success: false, message: `Failed to save: ${result.message}` };
        // }
    } catch (error) {
        console.error('An error occurred while saving to vault:', error);
        return { success: false, message: 'An error occurred while saving to vault.' };
    }
};

// Listen for messages from the content script
// Handles saving data to temp storage and opening popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_POPUP_EDITOR') {
        console.log("Received data, saving to temp storage and opening popup:", message.payload);

        // 1. Save the scraped data to temporary local storage
        chrome.storage.local.set({ tempChatData: message.payload });

        // 2. Create a new popup window with the popup.html file
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 450,
            height: 600
        });
        // saveToVault(message.payload);
    } else if (message.type === 'SAVE_FINAL_CHAT') {
        saveToVault(message.payload).then(sendResponse);
    } else if (message.type === 'GET_FOLDERS') {
        const fetchFolders = async () => {
            try {
                const cookie = await chrome.cookies.get({
                    url: PROMPTVAULT_API_URL,
                    name: '__session', // This is default name for Clerk's session cookie
                });

                if (!cookie) {
                    return { success: false, error: "Not authenticated. Please log in to PromptVault." };
                }

                const token = cookie.value;
                const response = await fetch(`${PROMPTVAULT_API_URL}/api/folders`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                // Also check if the response is valid JSON
                const contentType = response.headers.get("content-type");
                if (!response.ok || !contentType || !contentType.includes("application/json")) {
                    return { success: false, error: "Authentication failed. Please log in to PromptVault and try again." };
                }

                const folders = await response.json();
                return { success: true, data: folders };
            } catch (error) {
                console.error('An error occurred while fetching folders:', error);
                return { success: false, message: 'An error occurred while fetching folders.', error: error.message };
            }
        };

        fetchFolders().then(sendResponse);
    }

    return true;
});