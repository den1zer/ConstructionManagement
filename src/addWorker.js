
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBNmgSTXoabY_JhynyfxB-4KCcRvYLi6B4",
    authDomain: "constructionmanagementsy-b8e52.firebaseapp.com",
    projectId: "constructionmanagementsy-b8e52",
    storageBucket: "constructionmanagementsy-b8e52.firebasestorage.app",
    messagingSenderId: "390996667134",
    appId: "1:390996667134:web:0d99cf1ee58824195613af",
    measurementId: "G-1B0X0DGTC1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const addWorkerForm = document.getElementById('add-worker-form');
const workerNameInput = document.getElementById('worker-name');
const workerPhoneInput = document.getElementById('worker-phone');
const workerEmailInput = document.getElementById('worker-email');
const workerRateInput = document.getElementById('worker-rate');
const saveWorkerButton = document.getElementById('save-worker-button');
const messageDiv = document.getElementById('form-message');
const loadingIndicator = document.getElementById('loading-indicator');

function setLoading(isLoading) {
    if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none';
    if (saveWorkerButton) saveWorkerButton.disabled = isLoading;
}
function showMessage(msg, type = 'info') {
    if (messageDiv) { messageDiv.textContent = msg; messageDiv.className = `form-message message-${type}`;
        messageDiv.style.display = 'block'; } else { alert(`${type.toUpperCase()}: ${msg}`); }
}
function clearMessages() {
    if (messageDiv && messageDiv.style.display !== 'none') {
        messageDiv.textContent = ''; messageDiv.style.display = 'none'; }
}

if (addWorkerForm) {
    addWorkerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessages();
        const name = workerNameInput.value.trim();
        const selectedSpecialties = [];
        addWorkerForm.querySelectorAll('input[name="workerSpecialties"]:checked').forEach(checkbox => {
            selectedSpecialties.push(checkbox.value);
        });

        if (!name || selectedSpecialties.length === 0) {
            showMessage("Будь ласка, заповніть ім'я та оберіть хоча б одну спеціальність.", "error");
            return;
        }
        setLoading(true);
        showMessage("Додавання робітника...", "info");
        const workerData = {
            name: name,
            specialties: selectedSpecialties,
            phone: workerPhoneInput.value.trim() || null,
            email: workerEmailInput.value.trim().toLowerCase() || null,
            rate: workerRateInput.value ? parseFloat(workerRateInput.value) : null,
            createdAt: serverTimestamp()
        };
        try {
            const workersCollectionRef = collection(db, "workers");
            const docRef = await addDoc(workersCollectionRef, workerData);
            console.log("Робітника додано з ID: ", docRef.id);
            showMessage("Робітника успішно додано!", "success");
            addWorkerForm.reset();
        } catch (error) {
            console.error("Помилка додавання робітника: ", error);
            showMessage(error.code === 'permission-denied' ? "Помилка: Недостатньо прав." : `Помилка: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    });
    workerNameInput?.addEventListener('input', clearMessages);
    document.getElementById('specialties-checkbox-group')?.addEventListener('change', clearMessages);
    workerPhoneInput?.addEventListener('input', clearMessages);
    workerEmailInput?.addEventListener('input', clearMessages);
    workerRateInput?.addEventListener('input', clearMessages);
} else {
    console.error("Форма 'add-worker-form' не знайдена.");
}