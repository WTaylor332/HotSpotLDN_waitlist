// --- IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION HERE ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
// ----------------------------------------------------

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Form submission
document.getElementById('waitlistForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Hide previous error messages
    const errorEl = document.getElementById('errorMessage');
    errorEl.style.display = 'none';

    // --- Collect Form Data (including the new phone field) ---
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.trim(),
        gdprConsent: document.getElementById('gdprConsent').checked,
        marketingConsent: document.getElementById('marketingConsent').checked,
        website: document.querySelector('input[name="website"]').value
    };

    // --- Validate Form Data ---
    const errors = validateForm(formData);
    if (errors.length > 0) {
        showError(errors[0]);
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    // --- Set loading state ---
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    
    try {
        // --- Check for duplicate email ---
        const emailHash = await hashString(formData.email);
        const existing = await db.collection('waitlist').where('emailHash', '==', emailHash).get();
        
        if (!existing.empty) {
            showError('This email is already on the waiting list!');
            setLoading(false);
            return;
        }
        
        // --- Add data to Firestore ---
        const docRef = await db.collection('waitlist').add({
            name: formData.name,
            email: formData.email,
            phone: formData.phone, // Save the phone number
            emailHash: emailHash,
            marketingConsent: formData.marketingConsent,
            signupTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'website'
        });
        
        // --- Log consent for GDPR auditing ---
        await db.collection('consent_log').add({
            emailHash: emailHash,
            action: 'consent_given',
            gdprConsent: formData.gdprConsent,
            marketingConsent: formData.marketingConsent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // --- Show success message ---
        showSuccessState(formData.email);
        
    } catch (error) {
        console.error('Submission error:', error);
        showError('Sorry, something went wrong. Please try again later.');
        setLoading(false);
    }
});

function setLoading(isLoading) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');

    if(isLoading) {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

function validateForm(formData) {
    const errors = [];
    
    // Name validation
    if (!formData.name || formData.name.length < 2 || formData.name.length > 50) {
        errors.push('Please enter a valid name.');
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name)) {
        errors.push('Name can only contain letters, spaces, and hyphens.');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        errors.push('Please enter a valid email address.');
    }

    // Phone validation
    if (!formData.phone) {
        errors.push('Please enter your phone number.');
    } else if (!/^\+?[0-9\s-()]{7,20}$/.test(formData.phone)) {
        errors.push('Please enter a valid phone number.');
    }
    
    // Consent validation
    if (!formData.gdprConsent) {
        errors.push('You must accept the privacy policy to continue.');
    }
    
    // Honeypot check
    if (formData.website) {
        errors.push('Bot detected');
    }
    
    return errors;
}

// Reusable hashing function
async function hashString(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorEl.style.display = 'block'; // Make it visible
}

function showSuccessState(email) {
    document.getElementById('formContainer').innerHTML = `
        <div class="success-container">
            <div class="success-animation">🎉</div>
            <h2 style="color: var(--primary); font-size: 2.5rem; margin-bottom: 20px; text-shadow: 1px 1px 0px var(--secondary);">You're In!</h2>
            <p style="font-size: 1.3rem; margin-bottom: 20px; color: var(--dark); font-weight: 600;">Welcome to the Hot Spot London family!</p>
            <p>We'll email you at <strong style="color: var(--primary);">${email}</strong> the moment tickets drop.</p>
        </div>
    `;
}

// --- Modal Controls ---
function showPrivacyPolicy(e) {
    e.preventDefault();
    document.getElementById('privacyModal').style.display = 'block';
}

function showTerms(e) {
    e.preventDefault();
    document.getElementById('termsModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}