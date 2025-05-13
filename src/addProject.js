
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const firebaseAuthInstance = getAuth(app);
const firestoreDbInstance = getFirestore(app);


class AuthService {
    constructor(authInstance) {
        this.auth = authInstance;
    }
    onAuthChange(callback) {
        return onAuthStateChanged(this.auth, callback);
    }
    getCurrentUser() {
        return this.auth.currentUser;
    }
}


class DataService {
    constructor(dbInstance) {
        this.db = dbInstance;
    }

    async addProject(projectData) {
        const projectsCollectionRef = collection(this.db, "projects");
        return await addDoc(projectsCollectionRef, projectData);
    }

    async getWorkers() {
        const workersCollectionRef = collection(this.db, "workers");
        const q = query(workersCollectionRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

class AddProjectUI {
    constructor(dataServiceInstance) {
        this.dataService = dataServiceInstance;
        this.currentUserId = null;

        this.form = document.getElementById('add-project-form');
        this.projectNameInput = document.getElementById('project-name');
        this.projectDescriptionInput = document.getElementById('project-description');
        this.roomCountInput = document.getElementById('room-count');
        this.roomsContainer = document.getElementById('rooms-container');
        this.projectTasksListUL = document.getElementById('project-tasks-list');
        this.existingWorkersSelect = document.getElementById('existing-workers');
        this.projectWorkersListUL = document.getElementById('project-workers-list');
        this.ownerNameInput = document.getElementById('owner-name');
        this.ownerPhoneInput = document.getElementById('owner-contact-phone');
        this.ownerEmailInput = document.getElementById('owner-contact-email');
        this.projectStartDateInput = document.getElementById('project-start-date');
        this.projectInitialStatusSelect = document.getElementById('project-initial-status');
        this.saveProjectButton = document.getElementById('save-project-button');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.messageDiv = document.getElementById('form-message');

        if (!this.form) {
            console.error("Форма 'add-project-form' не знайдена!");
            return;
        }
        this._initListeners();
    }

    _initListeners() {
        this.form.addEventListener('submit', this._handleSubmit.bind(this));
        this.projectNameInput?.addEventListener('input', () => this._clearMessage());
        this.projectStartDateInput?.addEventListener('input', () => this._clearMessage());
    }

    setCurrentUserId(userId) {
        this.currentUserId = userId;
        if (this.saveProjectButton) this.saveProjectButton.disabled = !userId;
        if (userId) {
            this.loadWorkersIntoSelect();
        } else {
            if (this.existingWorkersSelect) this.existingWorkersSelect.innerHTML = '<option disabled value="">(Увійдіть для завантаження)</option>';
        }
    }

    _setLoading(isLoading) {
        if (this.loadingIndicator) this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        if (this.saveProjectButton) this.saveProjectButton.disabled = isLoading;
    }

    _showMessage(message, type = 'info') {
        if (this.messageDiv) {
            this.messageDiv.textContent = message;
            this.messageDiv.className = `form-message message-${type}`;
            this.messageDiv.style.display = 'block';
        } else { alert(`${type.toUpperCase()}: ${message}`); }
    }

    _clearMessage() {
        if (this.messageDiv && this.messageDiv.style.display !== 'none') {
            this.messageDiv.textContent = '';
            this.messageDiv.style.display = 'none';
        }
    }

    _getRoomData() {
        const rooms = [];
        const roomEntries = this.roomsContainer?.querySelectorAll('.room-entry');
        roomEntries?.forEach((entry, index) => {
            const lengthInput = entry.querySelector('input[name="roomLengths[]"]');
            const widthInput = entry.querySelector('input[name="roomWidths[]"]');
            const heightInput = entry.querySelector('input[name="roomHeights[]"]');
            const notesInput = entry.querySelector('input[name="roomNotes[]"]');
            rooms.push({
                roomNumber: index + 1,
                length: lengthInput ? parseFloat(lengthInput.value) || 0 : 0,
                width: widthInput ? parseFloat(widthInput.value) || 0 : 0,
                height: heightInput ? parseFloat(heightInput.value) || 0 : 0,
                notes: notesInput ? notesInput.value.trim() : ''
            });
        });
        return rooms;
    }

    _getTaskData() {
        const tasks = [];
        this.form?.querySelectorAll('input[name="standardTasks[]"]:checked').forEach(checkbox => {
            tasks.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                description: checkbox.value,
                type: 'standard',
                status: 'нове',
                assignedWorkerId: null
            });
        });
        return tasks;
    }

    _getSelectedWorkersData() {
        if (!this.existingWorkersSelect) return [];
        return Array.from(this.existingWorkersSelect.selectedOptions)
            .map(option => {
                if (option.value) {
                    return { id: option.value, name: option.textContent.split(' (')[0].trim() };
                }
                return null;
            }).filter(worker => worker !== null);
    }

    async loadWorkersIntoSelect() {
        if (!this.existingWorkersSelect) {
            console.warn("loadWorkersIntoSelect: Елемент select для робітників не знайдено.");
            return;
        }
        this.existingWorkersSelect.innerHTML = '<option disabled value="">(Завантаження...)</option>';
        try {
            const workers = await this.dataService.getWorkers();
            this.existingWorkersSelect.innerHTML = '';
            const placeholderOption = document.createElement('option');
            placeholderOption.value = "";
            placeholderOption.textContent = "-- Оберіть робітників --";
            this.existingWorkersSelect.appendChild(placeholderOption);

            if (workers.length === 0) {
                const noWorkersOption = document.createElement('option');
                noWorkersOption.disabled = true;
                noWorkersOption.textContent = "Робітників не знайдено";
                this.existingWorkersSelect.appendChild(noWorkersOption);
            } else {
                workers.forEach(worker => {
                    const option = document.createElement('option');
                    option.value = worker.id;
                    const specialtiesText = (worker.specialties && worker.specialties.length > 0)
                        ? worker.specialties.join(', ')
                        : 'без спеціальності';
                    option.textContent = `${worker.name || 'Без імені'} (${specialtiesText})`;
                    this.existingWorkersSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Помилка завантаження робітників у AddProjectUI:", error);
            if (this.existingWorkersSelect) this.existingWorkersSelect.innerHTML = '<option disabled value="">Помилка завантаження</option>';
        }
    }

    async _handleSubmit(event) {
        event.preventDefault();
        this._clearMessage();

        if (!this.currentUserId) {
            this._showMessage("Помилка: Ви не автентифіковані.", "error");
            return;
        }

        const projectName = this.projectNameInput.value.trim();
        const projectStartDate = this.projectStartDateInput.value;

        if (!projectName || !projectStartDate) {
            this._showMessage("Назва проекту та дата початку є обов'язковими.", "error");
            return;
        }

        this._setLoading(true);
        this._showMessage("Збереження проекту...", "info");

        try {
            const projectData = {
                name: projectName,
                description: this.projectDescriptionInput.value.trim(),
                owner: {
                    name: this.ownerNameInput.value.trim(),
                    phone: this.ownerPhoneInput.value.trim(),
                    email: this.ownerEmailInput.value.trim().toLowerCase()
                },
                startDate: projectStartDate,
                status: this.projectInitialStatusSelect.value,
                rooms: this._getRoomData(),
                tasks: this._getTaskData(),
                workers: this._getSelectedWorkersData(),
                creatorId: this.currentUserId,
                createdAt: serverTimestamp()
            };

            const docRef = await this.dataService.addProject(projectData);
            console.log("Проект успішно створено з ID: ", docRef.id);
            this._showMessage("Проект успішно створено! Перенаправлення...", "success");
            this.form.reset();
            if (this.roomsContainer) this.roomsContainer.innerHTML = '<p id="rooms-placeholder"><small>Поля для розмірів з\'являться тут.</small></p>';
            if (this.projectTasksListUL) this.projectTasksListUL.innerHTML = '';
            if (this.projectWorkersListUL) this.projectWorkersListUL.innerHTML = '';
            this.loadWorkersIntoSelect();

            setTimeout(() => {
                window.location.href = 'mainPage.html';
            }, 1500);

        } catch (error) {
            console.error("Помилка при збереженні проекту:", error);
            this._showMessage(error.code === 'permission-denied' ? "Помилка: Недостатньо прав." : `Помилка: ${error.message}`, "error");
        } finally {
            this._setLoading(false);
        }
    }
}

class AddProjectApp {
    constructor() {
        this.authService = new AuthService(firebaseAuthInstance);
        this.dataService = new DataService(firestoreDbInstance);
        this.ui = new AddProjectUI(this.dataService);
    }

    init() {
        console.log("AddProjectApp: init() called");
        this.authService.onAuthChange((user) => {
            console.log("AddProjectApp: onAuthStateChanged - user:", user);
            if (user) {
                this.ui.setCurrentUserId(user.uid);
            } else {
                this.ui.setCurrentUserId(null);
                console.log("Користувач не автентифікований (AddProjectPage), перенаправлення на логін.");
                window.location.href = 'index.html';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded for addProject.js");
    if (document.getElementById('add-project-form')) {
        const appInstance = new AddProjectApp();
        appInstance.init();
        console.log("AddProjectApp Initialized and init() called.");
    } else {
        console.warn("Форма 'add-project-form' не знайдена, AddProjectApp не ініціалізовано.");
    }
});