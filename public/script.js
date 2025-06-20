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

document.getElementById('waitlistForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    document.getElementById('errorMessage').style.display = 'none';

    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.trim(),
        gdprConsent: document.getElementById('gdprConsent').checked,
        marketingConsent: document.getElementById('marketingConsent').checked,
        website: document.querySelector('input[name="website"]').value
    };

    const errors = validateForm(formData);
    if (errors.length > 0) {
        showError(errors[0]);
        return;
    }
    
    setLoading(true);
    
    try {
        const emailHash = await hashString(formData.email);
        const existing = await db.collection('waitlist').where('emailHash', '==', emailHash).limit(1).get();
        
        if (!existing.empty) {
            showError('This email is already on the waiting list!');
            setLoading(false);
            return;
        }
        
        const docRef = await db.collection('waitlist').add({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            emailHash: emailHash,
            marketingConsent: formData.marketingConsent,
            signupTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'website'
        });
        
        await db.collection('consent_log').add({
            userId: docRef.id,
            emailHash: emailHash,
            gdprConsent: formData.gdprConsent,
            marketingConsent: formData.marketingConsent,
            action: 'Consent given during signup',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccessState(formData.email);
        
    } catch (error) {
        console.error('Submission error:', error);
        showError('Sorry, something went wrong. Please try again later.');
        setLoading(false);
    }
});

function validateForm(formData) {
    const errors = [];
    if (!formData.name) { errors.push('Please enter a valid name.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { errors.push('Please enter a valid email address.'); }
    // FIXED: Validates phone only if a value is entered
    if (formData.phone && !/^\+?[0-9\s-()]{7,20}$/.test(formData.phone)) {
        errors.push('Please enter a valid phone number format.');
    }
    if (!formData.gdprConsent) { errors.push('You must accept the privacy policy to continue.'); }
    if (formData.website) { errors.push('Bot detected'); }
    return errors;
}

// All other helper functions (setLoading, hashString, showError, showSuccessState, modals) remain the same.
function setLoading(isLoading) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = isLoading;
    btn.querySelector('#btnText').style.display = isLoading ? 'none' : 'inline';
    btn.querySelector('#spinner').style.display = isLoading ? 'block' : 'none';
}
async function hashString(str) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function showError(msg) {
    const errEl = document.getElementById('errorMessage');
    errEl.querySelector('#errorText').textContent = msg;
    errEl.style.display = 'block';
}
function showSuccessState(email) {
    document.getElementById('formContainer').innerHTML = `
        <div class="success-container">
            <div class="success-animation">🎉</div>
            <h2 style="color: var(--primary); font-size: 2.5rem; margin-bottom: 15px; text-shadow: 1px 1px 0px var(--secondary);">You're In!</h2>
            <p style="font-size: 1.1rem; color: var(--dark); max-width: 450px; margin: 0 auto 25px auto;">Welcome to the Hot Spot London family! We'll email you at <strong style="color: var(--primary);">${email}</strong> when tickets drop.</p>
            <div class="social-follow">
                <p style="font-weight: 700; margin-bottom: 15px;">Keep up with the latest announcements:</p>
                <a href="https://www.instagram.com/hotspot.ldn/?igsh=eHhndjY3cG1haXNk#" target="_blank" rel="noopener noreferrer" class="social-btn">
                    📸 Follow us on Instagram
                </a>
            </div>
        </div>
    `;
}
function showPrivacyPolicy(e) { e.preventDefault(); document.getElementById('privacyModal').style.display = 'block'; }
function showTerms(e) { e.preventDefault(); document.getElementById('termsModal').style.display = 'block'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal')) { event.target.style.display = 'none'; } }