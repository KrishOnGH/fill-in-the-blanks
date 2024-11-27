function getAPIKey() {
    try {
        const apiKey = localStorage.getItem('groqapikey');
        return apiKey ? apiKey : "Not Set";
    } catch (error) {
        return "Error";
    }
}

function saveAPIKey(api_key) {
    try {
        localStorage.setItem('groqapikey', api_key);
        return "Success";
    } catch (error) {
        return "Error";
    }
}

async function validate(api_key) {
    const test_call = await groqCall(api_key, "Hi");

    if (test_call?.error?.message === "Invalid API Key") {
        return "Invalid API Key";
    } else if (test_call?.choices?.[0]?.message?.content) {
        return api_key;
    } else {
        return "Unknown Error";
    }
}

async function groqCall(api_key, message) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: message }],
                model: "llama3-8b-8192"
            })
        });

        return await response.json();
    } catch (error) {
        return { error: { message: "Unknown error occurred" } };
    }
}

async function documentProcessing(api_key, document, query) {
    const new_doc = await groqCall(api_key, `Fix this document:\n${document}\n with this query:\n${query}`);
    return new_doc?.choices?.[0]?.message?.content || "";
}

document.addEventListener('DOMContentLoaded', async () => {
    async function setup() {
        try {
            const apiKey = await getAPIKey();

            if (apiKey === "Error") {
                return "Error";
            }

            const is_valid = await validate(apiKey);

            if (is_valid === "Invalid API Key") {
                return "Invalid";
            }

            if (is_valid === "Unknown error") {
                return "Error";
            }

            return apiKey;
        } catch (error) {
            return "Error";
        }
    }

    const api_key = await setup();

    if (api_key === "Invalid") {
        await navigateTo("Setup");
    } else if (api_key === "Error") {
        await navigateTo("Error");
    } else {
        await navigateTo("Home");
    }

    async function initializeSetupForm() {
        const currentApiKey = getAPIKey();
        document.getElementById('currentApiKey').value = currentApiKey;

        document.getElementById('saveApiKeyButton').addEventListener('click', async () => {
            const newApiKey = document.getElementById('newApiKey').value;
            const keyIsValid = await validate(newApiKey)

            if (keyIsValid == "Unknown Error") {
                navigateTo("Error")
            }
            else if (newApiKey && keyIsValid != "Invalid API Key") {
                saveAPIKey(newApiKey);
                document.getElementById('currentApiKey').value = newApiKey;
                document.getElementById('newApiKey').value = '';
                navigateTo("Home")
            } else {
                alert("Please enter a valid API key.");
            }
        });
    }

    async function navigateTo(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
    
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    
        if (pageId === "Setup") {
            await initializeSetupForm();
        }
    
        if (pageId === "Home") {
            await checkIfOnDocs();
        }
    }
    
    async function checkIfOnDocs() {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        let url = activeTab.url.split("?")[0]
        if (url && url.startsWith("https://docs.google.com/document/d/") && url.endsWith("/edit")) {
            navigateTo("Home");
        } else {
            navigateTo("NotOnDocs");
        }
    }

    const navButtons = document.getElementsByClassName('navButton');
    for (const button of navButtons) {
        const pageID = button.id.replace('toPage', '');
        button.addEventListener('click', async () => {
            await navigateTo(pageID);
        });
    }

    const google_doc_link = document.getElementById('google-doc-link');
    google_doc_link.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://docs.new/" })
    })
});
