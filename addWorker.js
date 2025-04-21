
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
const auth = getAuth(app);
const db = getFirestore(app);

const addWorkerForm = document.getElementById('add-worker-form');
const workerNameInput = document.getElementById('worker-name');
const workerSpecialtySelect = document.getElementById('worker-specialty');
const workerPhoneInput = document.getElementById('worker-phone');
const workerEmailInput = document.getElementById('worker-email');
const workerRateInput = document.getElementById('worker-rate');
const saveWorkerButton = document.getElementById('save-worker-button');
const messageDiv = document.getElementById('form-message');
const loadingIndicator = document.getElementById('loading-indicator');

addWorkerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!workerNameInput.value || !workerSpecialtySelect.value) {
        showMessage("Будь ласка,заповніть ім'я та спеціальність робітника.", "error");
        return;
    }

    setLoading(true);
    showMessage("Додавання робітника...", "info");

    const workerData = {
        name: workerNameInput.value.trim(),
        specialty: workerSpecialtySelect.value,
        phone: workerPhoneInput.value.trim() || null,
        email: workerEmailInput.value.trim().toLowerCase() || null,
        rate: workerRateInput.value ? parseFloat(workerRateInput.value) : null,
        createdAt: serverTimestamp()
    };

    try {
        const workersCollectionRef = collection(db, "workers");
        const docRef = await addDoc(workersCollectionRef, workerData);

        console.log("Робітника додано з ID: ", docRef.id);
        showMessage("Робітника успішно додано до системи!", "success");
        addWorkerForm.reset();

    } catch (error) {
        console.error("Помилка додавання робітника: ", error);
        showMessage(`Помилка: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    if (saveWorkerButton) {
        saveWorkerButton.disabled = isLoading;
    }
}

function showMessage(message, type = 'info') {
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message-${type}`;
        messageDiv.style.display = 'block';
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}