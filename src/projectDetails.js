import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, documentId, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
    async signOutUser() {
        try {
            await signOut(this.auth);
            console.log("Користувач вийшов.");
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Помилка виходу:', error);
        }
    }
}

class ProjectDetailsService {
    constructor(dbInstance) {
        this.db = dbInstance;
    }

    async getProjectById(projectId) {
        console.log(`[ProjectDetailsService] Запит проекту з ID: ${projectId}`);
        if (!projectId) throw new Error("Project ID is required for getProjectById.");
        const projectRef = doc(this.db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) {
            console.warn(`[ProjectDetailsService] Проект з ID ${projectId} НЕ ЗНАЙДЕНО.`);
            throw new Error(`Проект з ID ${projectId} не знайдено.`);
        }
        console.log(`[ProjectDetailsService] Проект з ID ${projectId} ЗНАЙДЕНО. Дані:`, projectSnap.data());
        return { id: projectSnap.id, ...projectSnap.data() };
    }

    async getWorkersByIds(workerIds = []) {
        console.log(`[ProjectDetailsService] Запит робітників за ID:`, workerIds);
        if (workerIds.length === 0) {
            console.log("[ProjectDetailsService] Масив ID робітників порожній, повертаю порожню Map.");
            return new Map();
        }
        const workersMap = new Map();
        const workersRef = collection(this.db, "workers");
        const MAX_IN_QUERIES = 30;
        const chunks = [];
        for (let i = 0; i < workerIds.length; i += MAX_IN_QUERIES) {
            chunks.push(workerIds.slice(i, i + MAX_IN_QUERIES));
        }
        console.log(`[ProjectDetailsService] Розбито ID робітників на частини (chunks):`, chunks);
        for (const chunk of chunks) {
            if (chunk.length > 0) {
                console.log(`[ProjectDetailsService] Обробка частини ID:`, chunk);
                const q = query(workersRef, where(documentId(), "in", chunk));
                const querySnapshot = await getDocs(q);
                console.log(`[ProjectDetailsService] Для частини ID отримано документів: ${querySnapshot.size}`);
                querySnapshot.forEach(docSnap => {
                    console.log(`[ProjectDetailsService] Додано робітника в мапу: ID=${docSnap.id}, Дані=`, docSnap.data());
                    workersMap.set(docSnap.id, docSnap.data());
                });
            }
        }
        console.log(`[ProjectDetailsService] Фінальна завантажена мапа робітників:`, workersMap);
        return workersMap;
    }
}

class ProjectDetailsUI {
    constructor() {
        this.loadingDiv = document.getElementById('loading-details');
        this.contentDiv = document.getElementById('project-details-content');
        this.notFoundDiv = document.getElementById('project-not-found');
        this.messageArea = document.getElementById('message-area');

        this.projectNameEl = document.getElementById('project-name');
        this.projectStatusEl = document.getElementById('project-status');
        this.projectDescriptionEl = document.getElementById('project-description');
        this.projectStartDateEl = document.getElementById('project-start-date');
        this.projectEndDateEl = document.getElementById('project-end-date');
        this.clientNameEl = document.getElementById('client-name');
        this.clientPhoneEl = document.getElementById('client-phone');
        this.clientEmailEl = document.getElementById('client-email');

        this.roomListEl = document.getElementById('room-list');
        this.projectTasksEl = document.getElementById('project-tasks');
        this.projectWorkersEl = document.getElementById('project-workers');

        this.userEmailSpan = document.getElementById('user-email');
        this.logoutButton = document.getElementById('logout-button');
        this.goToTaskPlannerBtn = document.getElementById('go-to-task-planner-btn');
        console.log("[ProjectDetailsUI] Конструктор: DOM елементи отримано (або не отримано, якщо null)");
    }

    setLoading(isLoading) {
        if (this.loadingDiv) this.loadingDiv.style.display = isLoading ? 'block' : 'none';
        if (this.contentDiv) this.contentDiv.style.display = isLoading ? 'none' : 'block';
        if (isLoading && this.notFoundDiv) this.notFoundDiv.style.display = 'none';
    }

    showMessage(message, type = 'info') {
        if (this.messageArea) {
            this.messageArea.textContent = message;
            this.messageArea.className = `form-message message-${type}`;
            this.messageArea.style.display = 'block';
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    clearMessages() {
        if (this.messageArea) this.messageArea.style.display = 'none';
    }

    displayProjectNotFound(message = 'Проект не знайдено або у вас немає доступу.') {
        console.warn(`[ProjectDetailsUI] Відображення "Проект не знайдено": ${message}`);
        if (this.notFoundDiv) {
            this.notFoundDiv.textContent = message;
            this.notFoundDiv.style.display = 'block';
        }
        if (this.contentDiv) this.contentDiv.style.display = 'none';
    }

    displayUserData(email) {
        if (this.userEmailSpan) this.userEmailSpan.textContent = email || '';
    }

    setupLogoutButton(logoutHandler) {
        if (this.logoutButton && !this.logoutButton.dataset.listenerAttached) {
            this.logoutButton.addEventListener('click', logoutHandler);
            this.logoutButton.dataset.listenerAttached = 'true';
        }
    }

    renderProjectData(projectData, workersMap = new Map()) {
        console.log("[ProjectDetailsUI] Початок renderProjectData. Дані проекту:", JSON.parse(
            JSON.stringify(projectData || {})), "Мапа робітників:",
            JSON.parse(JSON.stringify(Array.from(workersMap.entries()))));
        if (!projectData) {
            console.warn("[ProjectDetailsUI] renderProjectData: немає даних проекту.");
            this.displayProjectNotFound("Дані проекту не отримано.");
            return;
        }

        if(this.projectNameEl) this.projectNameEl.textContent = projectData.name || 'Назва відсутня';
        if(this.projectStatusEl) {
            this.projectStatusEl.textContent = projectData.status || 'Невідомо';
            const statusClass = `status-${(projectData.status || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
            this.projectStatusEl.className = `project-status ${statusClass}`;
        }
        if(this.projectDescriptionEl) this.projectDescriptionEl.textContent = projectData.description || 'Опис відсутній';
        if(this.projectStartDateEl) this.projectStartDateEl.textContent = projectData.startDate || 'Не вказано';
        if(this.projectEndDateEl) this.projectEndDateEl.textContent = projectData.endDate || 'Не вказано';

        if(this.clientNameEl) this.clientNameEl.textContent = projectData.owner?.name || 'Не вказано';
        if(this.clientPhoneEl) this.clientPhoneEl.textContent = projectData.owner?.phone || 'Не вказано';
        if(this.clientEmailEl) this.clientEmailEl.textContent = projectData.owner?.email || 'Не вказано';

        console.log("[ProjectDetailsUI] Перед рендерингом кімнат, робітників, завдань.");
        this._renderRooms(projectData.rooms);
        this._renderWorkersList(projectData.workers, workersMap);
        this._renderTasks(projectData.tasks, workersMap);
        this.setupGoToTaskPlannerButton(projectData.id);
        console.log("[ProjectDetailsUI] Завершення renderProjectData.");
    }

    _renderRooms(rooms = []) {
        if (!this.roomListEl) { console.warn("[ProjectDetailsUI] Елемент 'room-list' не знайдено."); return;}
        this.roomListEl.innerHTML = '';
        if (!rooms || rooms.length === 0) {
            this.roomListEl.innerHTML = '<li>Дані про приміщення відсутні.</li>'; return;
        }
        rooms.forEach(room => {
            const item = document.createElement('li');
            item.textContent = `Кімната ${room.roomNumber || ''}: ${room.length || '?'}м x ${room.width || '?'}м x ${room.height || '?'}м. ${room.notes ? 'Нотатки: ' + room.notes : ''}`;
            this.roomListEl.appendChild(item);
        });
    }

    _renderWorkersList(assignedProjectWorkers = [], workersDataMap = new Map()) {
        if (!this.projectWorkersEl) { console.warn("[ProjectDetailsUI] Елемент 'project-workers' не знайдено."); return;}
        this.projectWorkersEl.innerHTML = '';
        if (!assignedProjectWorkers || assignedProjectWorkers.length === 0) {
            this.projectWorkersEl.innerHTML = '<li>Робітники не призначені.</li>'; return;
        }
        assignedProjectWorkers.forEach(workerInfoOnProject => {
            const li = document.createElement('li');
            const fullWorkerData = workersDataMap.get(workerInfoOnProject.id);
            if (fullWorkerData) {
                const name = fullWorkerData.name || 'Ім\'я невідоме';
                const specialties = fullWorkerData.specialties;
                const specialtiesText = (specialties && specialties.length > 0) ? specialties.join(', ') : 'Спеціальність не вказана';
                li.textContent = `${name} (${specialtiesText})`;
            } else {
                li.textContent = `${workerInfoOnProject.name || 'ID: ' + workerInfoOnProject.id} (Деталі не завантажено)`;
            }
            this.projectWorkersEl.appendChild(li);
        });
    }

    _renderTasks(tasks = [], workersDataMap = new Map()) {
        if (!this.projectTasksEl) { console.warn("[ProjectDetailsUI] Елемент 'project-tasks' не знайдено."); return;}
        this.projectTasksEl.innerHTML = '';
        if (!tasks || tasks.length === 0) {
            this.projectTasksEl.innerHTML = '<li>Завдання не додані.</li>'; return;
        }
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            const assignedWorkerData = task.assignedWorkerId ? workersDataMap.get(task.assignedWorkerId) : null;
            const workerName = assignedWorkerData ? assignedWorkerData.name : 'Не призначено';
            const statusText = task.status || 'невідомий';
            const statusClass = `task-status-${statusText.toLowerCase().replace(/\s+/g, '_')}`;

            li.innerHTML = `
                <span>${index + 1}. ${task.description || 'Без опису'}</span>
                <span style="margin-left: auto; padding-left: 15px; text-align: right;">
                    <span class="${statusClass}" style="font-style: italic;">(${statusText})</span>
                    <span style="margin-left: 10px;">Призначено: ${workerName}</span>
                </span>`;
            this.projectTasksEl.appendChild(li);
        });
    }

    setupGoToTaskPlannerButton(projectId) {
        if (this.goToTaskPlannerBtn) {
            if (!projectId) {
                console.warn("[ProjectDetailsUI] ID проекту не надано, кнопка планувальника не буде активна.");
                this.goToTaskPlannerBtn.style.display = 'none';
                return;
            }
            this.goToTaskPlannerBtn.href = `taskPlanner.html?id=${projectId}`;
            this.goToTaskPlannerBtn.style.display = 'inline-block';
            console.log(`[ProjectDetailsUI] Кнопка "Планувальник" налаштована: href=${this.goToTaskPlannerBtn.href}`);
        } else {
            console.warn("Кнопка 'go-to-task-planner-btn' не знайдена в DOM на сторінці projectDetails.html.");
        }
    }
}

class ProjectDetailsApp {
    constructor() {
        this.authService = new AuthService(firebaseAuthInstance);
        this.projectService = new ProjectDetailsService(firestoreDbInstance);
        this.ui = new ProjectDetailsUI();
        this.projectId = this._getProjectIdFromUrl();
        console.log(`ProjectDetailsApp constructor: Project ID з URL = ${this.projectId}`);
    }

    _getProjectIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        console.log(`_getProjectIdFromUrl: Витягнуто ID = ${id}`);
        return id;
    }

    init() {
        console.log(`ProjectDetailsApp init: Початок. projectId = ${this.projectId}`);
        if (!this.projectId) {
            this.ui.setLoading(false);
            this.ui.displayProjectNotFound('ID проекту не вказано в URL.');
            console.error("Project ID не знайдено в URL для ініціалізації.");
            return;
        }

        this.authService.onAuthChange(async (user) => {
            console.log("ProjectDetailsApp onAuthChange: Стан користувача змінився. User:", user ? user.uid : 'null');
            if (user) {
                console.log(`ProjectDetailsApp onAuthChange: Користувач Є. UID = ${user.uid}`);
                this.ui.displayUserData(user.email);
                this.ui.setupLogoutButton(() => this.authService.signOutUser());
                await this._loadData();
            } else {
                console.log("Користувач не автентифікований на сторінці деталей, перенаправлення на логін.");

                window.location.href = '../index.html';
            }
        });
    }

    async _loadData() {
        console.log(`ProjectDetailsApp _loadData: Починаємо завантаження для projectId = ${this.projectId}`);
        this.ui.setLoading(true);
        this.ui.clearMessages();
        try {
            const project = await this.projectService.getProjectById(this.projectId);
            console.log("ProjectDetailsApp _loadData: Отримано проект з Firestore:", JSON.parse(JSON.stringify(project || {})));
            if (project && project.id) {
                let workersMap = new Map();
                const workerInfoArray = project.workers || [];
                const workerIdsToFetch = workerInfoArray.map(w => w.id).filter(id => id);

                console.log("ProjectDetailsApp _loadData: ID робітників для завантаження деталей:", workerIdsToFetch);
                if (workerIdsToFetch.length > 0) {
                    workersMap = await this.projectService.getWorkersByIds(workerIdsToFetch);
                }
                console.log("ProjectDetailsApp _loadData: Мапа робітників отримана:", JSON.parse(JSON.stringify(Array.from(workersMap.entries()))));

                this.ui.renderProjectData(project, workersMap);
                if (this.ui.contentDiv) this.ui.contentDiv.style.display = 'block';

            } else {
                this.ui.displayProjectNotFound("Дані проекту не знайдено після запиту або проект не має ID.");
            }
        } catch (error) {
            console.error("Помилка при завантаженні та відображенні деталей проекту:", error);
            this.ui.displayProjectNotFound(error.message);
        } finally {
            this.ui.setLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("projectDetails.js: DOMContentLoaded спрацював.");
    const appInstance = new ProjectDetailsApp();
    appInstance.init();
    console.log("projectDetails.js: ProjectDetailsApp ініціалізовано та викликано init().");
});