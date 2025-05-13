import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
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
const auth = getAuth(app);

class AuthService {
    async signIn(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async signOut() {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Помилка виходу:', error);
        }
    }

    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    }

    getFriendlyAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'Неправильний email.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'Неправильний email або пароль.';
            default: return `Помилка. (${error.code})`;
        }
    }
}

class LoginForm {
    constructor(formId, emailId, passwordId, messageId, loadingId, buttonId, authService) {
        this.form = document.getElementById(formId);
        this.emailInput = document.getElementById(emailId);
        this.passwordInput = document.getElementById(passwordId);
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
    }

    _getFormData() {
        return { email: this.emailInput?.value.trim() || '', password: this.passwordInput?.value || '' };
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
        if (this.loadingIndicator) this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        if (this.submitButton) this.submitButton.disabled = isLoading;
    }

    _clearErrorMessage() {
        if (this.messageDiv?.style.display !== 'none') {
            this.messageDiv.textContent = '';
            this.messageDiv.style.display = 'none';
        }
    }

    async _handleSubmit(event) {
        event.preventDefault();
        this._clearErrorMessage();
        const { email, password } = this._getFormData();

        if (!email || !password) {
            this._showMessage('Будь ласка, введіть email та пароль.', 'error');
            return;
        }

        this._setLoading(true);

        try {
            await this.authService.signIn(email, password);
            this._showMessage('Вхід виконано! Перенаправлення...', 'success');
            setTimeout(() => { window.location.href = 'mainPage.html'; }, 1000);
        } catch (error) {
            this._showMessage(this.authService.getFriendlyAuthErrorMessage(error), 'error');
            this._setLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authService = new AuthService();
    new LoginForm(
        'login-form',
        'login-email',
        'login-password',
        'login-message',
        'loading-indicator',
        'login-button',
        authService
    );

    authService.onAuthStateChanged(user => {
        if (user && !window.location.pathname.includes('mainPage.html')) {
            window.location.href = 'mainPage.html';
        }
    });
});

function signOutUser(authServiceInstance) {
    authServiceInstance.signOut();
}