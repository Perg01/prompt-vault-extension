// Checks if the right place to add the extension button exists on the ChatGPT interface.
// Finds all message turns using the <article> tag.
function scrapeConversation() {
    console.log('PromptVault: Scraping conversation...');;
    let conversationText = '';
    let conversationTitle = 'Untitled Chat';

    const messageTurns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');

    if (messageTurns.length === 0) {
        console.log('Scraping failed: Could not find any conversation text. The ChatGPT UI may have changed.');
        alert('Scraping Failed: Could not find any conversation text to scrape. The ChatGPT UI may have changed.');
        return;
    }

    messageTurns.forEach((turn, index) => {
        const authorRoleContainer = turn.querySelector('div[data-message-author-role]');
        if (!authorRoleContainer) {
            return;
        }

        const authorRole = authorRoleContainer.getAttribute('data-message-author-role');
        const author = (authorRole === 'user') ? 'User' : 'ChatGPT';

        // First, look for the container used for AI messages
        let contentElement = turn.querySelector('.markdown.prose');

        // If that's not found, it's likely a user message. Look for its simpler container.
        if (!contentElement) {
            contentElement = turn.querySelector('.whitespace-pre-wrap');
        }
        const message = contentElement ? contentElement.textContent.trim() : '';

        if (author === 'User' && index === 0 && message) {
            conversationTitle = message.substring(0, 50) + '...';
        }

        if (message) {
            conversationText += `${author}:\n${message}\n\n`;
        }
    });

    if (conversationText) {
        console.log('--- SCRAPED CONTENT ---');
        console.log(conversationText);

        // Send the scraped data to the background script
        chrome.runtime.sendMessage({
            type: 'OPEN_POPUP_EDITOR', payload: {
                title: conversationTitle, content: conversationText.trim()
            }
        });
        alert('Conversation data sent to background for processing!');
    } else {
        console.log('Could not find any conversation text.');
        alert('Could not scrape any text, though message containers were found.');
    }
}

function injectStyles() {
    const styleId = 'promptvault-styles';
    if (document.getElementById(styleId)) {
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    #promptvault-save-btn {
      /* Base styles from before */
      display: flex;
      align-items: center;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: 1.5rem; /* Increased bottom margin slightly */
      background-color: #333;
      color: white;
      border: 1px solid #555;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      z-index: 2147483647; /* Use a very high z-index to stay on top */
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.2s ease-in-out; /* Add transition for smooth hover */
    }

    /* This is our new hover effect */
    #promptvault-save-btn:hover {
      filter: brightness(1.15);
      transform: translateX(-50%) translateY(-2px); /* Lift effect */
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
  `;
    document.head.appendChild(style);
}



function addSaveButton() {
    // Find the target area where ChatGPT puts its "Regenerate" button
    const promptTextarea = document.querySelector('div[id="prompt-textarea"]');
    if (!promptTextarea) {
        return;
    }

    // Find the form that the textarea is inside of
    const form = promptTextarea.closest('form');
    if (!form) return; // exist if not found

    // Use the form's parent as the target area to ensure the button is a sibling, not inside the form
    const targetArea = form.parentElement;

    // Check if our button already exists before adding it

    if (targetArea && !document.getElementById('promptvault-save-btn')) {
        console.log('PromptVault: Target area found. Adding save button.');
        injectStyles();

        // Ensure the container can be a reference for our button's absolute positioning and z-index.
        if (getComputedStyle(targetArea).position === 'static') {
            targetArea.style.position = 'relative';
        }

        const saveButton = document.createElement('button');
        saveButton.id = 'promptvault-save-btn';
        saveButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" />
        </svg> Save to PromptVault`;

        saveButton.addEventListener('click', scrapeConversation);
        targetArea.appendChild(saveButton);
    }
}


// checks for the button every second because elements on chatgpt site are loaded dynamically.
setInterval(addSaveButton, 1000);