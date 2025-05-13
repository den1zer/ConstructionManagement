import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

class AuthService {
    constructor(firebaseApp) {
        this.auth = getAuth(firebaseApp);
    }

    registerUser(email, password) {
        return createUserWithEmailAndPassword(this.auth, email, password);
    }

    onAuthStateChanged(callback) {
        return onAuthStateChanged(this.auth, callback);
    }

    getFriendlyAuthErrorMessage(error) {
        let friendlyMessage = 'Помилка реєстрації. ';
        switch (error.code) {
            case 'auth/invalid-email':
                friendlyMessage += 'Неправильний формат email.';
                break;
            case 'auth/email-already-in-use':
                friendlyMessage += 'Цей email вже використовується.';
                break;
            case 'auth/weak-password':
                friendlyMessage += 'Пароль занадто слабкий (мінімум 6 символів).';
                break;
            case 'auth/operation-not-allowed':
                friendlyMessage += 'Реєстрація з email/паролем не дозволена.';
                break;
            default:
                friendlyMessage += `Спробуйте пізніше (${error.code}).`;
        }
        return friendlyMessage;
    }
}

class RegisterForm {
    constructor(formId, emailId, passwordId, confirmPasswordId, messageId, loadingId, buttonId, authService) {
        this.form = document.getElementById(formId);
        this.emailInput = document.getElementById(emailId);
        this.passwordInput = document.getElementById(passwordId);
        this.confirmPasswordInput = document.getElementById(confirmPasswordId);
        this.messageDiv = document.getElementById(messageId);
        this.loadingIndicator = document.getElementById(loadingId);
        this.submitButton = document.getElementById(buttonId);
        this.authService = authService;

        if (!this.form) console.error(`Форма "${formId}" не знайдена!`);
        this._setupEventListeners();
    }

    _setupEventListeners() {
        this.form?.addEventListener('submit', this._handleSubmit.bind(this));
        this.emailInput?.addEventListener('input', this._clearErrorMessage.bind(this));
        this.passwordInput?.addEventListener('input', this._clearErrorMessage.bind(this));
        this.confirmPasswordInput?.addEventListener('input', this._clearErrorMessage.bind(this));
    }

    _getFormData() {
        return {
            email: this.emailInput?.value.trim() || '',
            password: this.passwordInput?.value || '',
            confirmPassword: this.confirmPasswordInput?.value || ''
        };
    }

    _showMessage(message, type = 'info') {
        if (this.messageDiv) {
            this.messageDiv.textContent = message;
            this.messageDiv.className = `form-message message-${type}`;
            this.messageDiv.style.display = 'block';
            this.messageDiv.style.color = (type === 'error') ? 'red' : (type === 'success' ? 'green' : 'black');
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    _setLoading(isLoading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
        if (this.submitButton) {
            this.submitButton.disabled = isLoading;
        }
    }

    _clearErrorMessage() {
        if (this.messageDiv && this.messageDiv.style.display !== 'none') {
            this.messageDiv.textContent = '';
            this.messageDiv.style.display = 'none';
        }
    }

    async _handleSubmit(event) {
        event.preventDefault();
        this._clearErrorMessage();
        const { email, password, confirmPassword } = this._getFormData();

        if (!email || !password || !confirmPassword) {
            this._showMessage('Будь ласка, заповніть усі поля.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this._showMessage('Паролі не співпадають.', 'error');
            return;
        }

        if (password.length < 6) {
            this._showMessage('Пароль має містити щонайменше 6 символів.', 'error');
            return;
        }

        this._setLoading(true);

        try {
            const userCredential = await this.authService.registerUser(email, password);
            console.log('Успішна реєстрація:', userCredential.user.email);
            this._showMessage('Реєстрація успішна! Перенаправлення...', 'success');
            setTimeout(() => {
                window.location.href = 'html/mainPage.html';
            }, 1500);
        } catch (error) {
            console.error('Помилка реєстрації:', error);
            this._showMessage(this.authService.getFriendlyAuthErrorMessage(error), 'error');
            this._setLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authService = new AuthService(app);

    const registerForm = new RegisterForm(
        'register-form',
        'register-email',
        'register-password',
        'register-confirm-password',
        'register-message',
        'loading-indicator',
        'register-button',
        authService
    );

    authService.onAuthStateChanged(user => {
        if (user) {
            console.log("Користувач вже увійшов, перенаправлення з register page...");
            if (!window.location.pathname.includes('mainPage.html')) {
                window.location.href = 'mainPage.html';
            }
        }
    });

    console.log("Register Page Initialized");
});