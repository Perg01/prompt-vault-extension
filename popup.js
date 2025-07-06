
document.addEventListener('DOMContentLoaded', () => {
    // When the popup loads, get the chat data that the background script saved for us
    // Not saving to local storage yet. We do that in the background script
    const form = document.getElementById('save-form');
    const titleInput = document.getElementById('title-input');
    const contentPreview = document.getElementById('content-preview');
    const tagsInput = document.getElementById('tags-input');
    const saveButton = document.getElementById('save-button');
    const statusMessage = document.getElementById('status-message');
    const folderSelect = document.getElementById('folder-select');

    let originalContent = '';

    const populateFolders = (folders) => {
        if (!folders || folders.length === 0) return;
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            folderSelect.appendChild(option);
        });
    };

    // Populate the form with the data saved in temporary storage
    chrome.storage.local.get(['tempChatData'], (result) => {
        if (result.tempChatData) {
            const { title, content } = result.tempChatData;
            titleInput.value = title;
            contentPreview.textContent = content;
            originalContent = content; // Store the original content

            chrome.storage.local.remove('tempChatData');
        }
    });

    // Fetch folders from the backend and populate the dropdown in the popup
    chrome.runtime.sendMessage({ type: 'GET_FOLDERS' }, (response) => {
        if (response && response.success) {
            console.log("Folders received:", response.data);
            populateFolders(response.data);
        } else {
            console.error("Failed to fetch folders:", response?.error || "Unknown error");
        }
    });

    // Listen for the form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        statusMessage.textContent = '';

        const tagsArray = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const selectedFolderId = folderSelect.value === 'unfiled' ? null : folderSelect.value;

        // Send the FINAL data to the background script to be saved
        chrome.runtime.sendMessage({
            type: 'SAVE_FINAL_CHAT',
            payload: {
                title: titleInput.value,
                content: originalContent,
                tags: tagsArray,
                folderId: selectedFolderId,
            }
        }, (response) => {
            if (response.success) {
                statusMessage.textContent = 'Chat saved successfully!';
                saveButton.style.color = 'green';
                setTimeout(() => {
                    window.close(), 1000;
                })
            } else {
                statusMessage.textContent = response.message || 'Failed to save.';
                saveButton.style.color = 'red';
                saveButton.disabled = false;
                saveButton.textContent = 'Save to Vault';
            }
        });
    });
});