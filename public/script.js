import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDysYByueX654KLqqgpwnapxQBKLWnRflk",
  authDomain: "hotspot-ldn-events.firebaseapp.com",
  projectId: "hotspot-ldn-events",
  storageBucket: "hotspot-ldn-events.firebasestorage.app",
  messagingSenderId: "437464145360",
  appId: "1:437464145360:web:c359d01cffd9aba3802dd5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DOM Element References ---
const form = document.getElementById('waitlistForm');
const formContainer = document.getElementById('formContainer');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');
const errorMessageEl = document.getElementById('errorMessage');

// --- Form Submission Logic ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // Get form data
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const gdprConsentInput = document.getElementById('gdprConsent');
    const marketingConsentInput = document.getElementById('marketingConsent');
    const honeypotInput = document.querySelector('input[name="website"]');

    // Basic validation
    if (honeypotInput.value) {
        console.warn("Bot detected via honeypot.");
        return;
    }
    if (!form.checkValidity()) {
        showError("Please fill out all required fields correctly.");
        return;
    }

    const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        gdprConsent: gdprConsentInput.checked,
        marketingConsent: marketingConsentInput.checked,
    };

    setLoading(true);

    try {
        // Check if email already exists
        const existing = await db.collection('waitlist').where('email', '==', formData.email).get();
        if (!existing.empty) {
            showError('This email is already on the waiting list!');
            setLoading(false);
            return;
        }

        // Add to 'waitlist' collection
        const waitlistRef = await db.collection('waitlist').add({
            name: formData.name,
            email: formData.email,
            marketingConsent: formData.marketingConsent,
            signupTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'Website Waiting List'
        });

        // Add to 'consent_log' for auditing
        await db.collection('consent_log').add({
            userId: waitlistRef.id,
            email: formData.email,
            gdprConsent: formData.gdprConsent,
            marketingConsent: formData.marketingConsent,
            action: 'Consent given during signup',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // We'll fake a success message for now, since we aren't sending real emails yet.
        showSuccessMessage(formData.email);

    } catch (error) {
        console.error("Submission Error: ", error);
        showError('Sorry, something went wrong. Please try again later.');
        setLoading(false);
    }
});


// --- UI Helper Functions ---
function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.classList.add('error-message');
}

function clearError() {
    errorMessageEl.textContent = '';
    errorMessageEl.classList.remove('error-message');
}

function showSuccessMessage(email) {
    formContainer.innerHTML = `
        <div class="success-container">
            <div class="success-animation">🎉</div>
            <h2 style="font-size: 2.5rem; color: var(--primary);">You're on the list!</h2>
            <p style="font-size: 1.2rem; margin-top: 15px;">Thank you for joining. We'll email you at <strong style="color:var(--primary);">${email}</strong> when tickets drop!</p>
            <p style="margin-top: 25px;">Follow us on social media for sneak peeks:</p>
            </div>
    `;
}

// --- Modal Handling ---
function showPrivacyPolicy(e) {
    if (e) e.preventDefault();
    document.getElementById('privacyModal').style.display = 'block';
}

function showTerms(e) {
    if (e) e.preventDefault();
    document.getElementById('termsModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking on the background
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}