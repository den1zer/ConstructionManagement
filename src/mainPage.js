
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    onAuthChange(callback) {
        return onAuthStateChanged(this.auth, callback);
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
            console.log('Користувач вийшов');

            window.location.href = '../index.html';
        } catch (error) {
            console.error('Помилка виходу:', error);
            alert('Не вдалося вийти. Спробуйте ще раз.');
        }
    }
}

class ProjectService {
    constructor(firebaseApp) {
        this.db = getFirestore(firebaseApp);
    }

    async getProjectsByCreator(userId) {
        if (!userId) {
            console.error("ProjectService: User ID не надано для отримання проектів.");
            return [];
        }
        try {
            const projectsRef = collection(this.db, "projects");
            const q = query(projectsRef,
                where("creatorId", "==", userId),
                orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("ProjectService: Помилка отримання проектів з Firestore:", error);
            throw error;
        }
    }

    async deleteProject(projectId) {
        if (!projectId) {
            console.error("ProjectService: Project ID не надано для видалення.");
            throw new Error("Необхідний ID проекту для видалення.");
        }
        const projectRef = doc(this.db, "projects", projectId);
        await deleteDoc(projectRef);
        console.log(`ProjectService: Проект з ID ${projectId} успішно видалено.`);
    }
}

class DashboardUI {
    constructor() {
        this.projectListContainer = document.getElementById('project-list-container');
        this.loadingProjectsDiv = document.getElementById('loading-projects');
        this.noProjectsDiv = document.getElementById('no-projects');
        this.userEmailSpan = document.getElementById('user-email');
        this.logoutButton = document.getElementById('logout-button');

        if (!this.projectListContainer) console.error("DashboardUI Error: Елемент 'project-list-container' не знайдено.");
        if (!this.loadingProjectsDiv) console.warn("DashboardUI Warning: Елемент 'loading-projects' не знайдено.");
        if (!this.noProjectsDiv) console.warn("DashboardUI Warning: Елемент 'no-projects' не знайдено.");
    }

    displayUserEmail(email) {
        if (this.userEmailSpan) {
            this.userEmailSpan.textContent = email || '';
        }
    }

    setupLogoutButton(logoutHandler) {
        if (this.logoutButton) {
            if (!this.logoutButton.dataset.listenerAttached) {
                this.logoutButton.addEventListener('click', logoutHandler);
                this.logoutButton.dataset.listenerAttached = 'true';
            }
        } else {
            console.warn("DashboardUI Warning: Кнопка виходу (logout-button) не знайдена.");
        }
    }

    setLoadingState(isLoading) {
        if (this.loadingProjectsDiv) this.loadingProjectsDiv.style.display = isLoading ? 'block' : 'none';
        if (this.noProjectsDiv) this.noProjectsDiv.style.display = 'none';
        if (this.projectListContainer) {
            if (isLoading) {
                this.projectListContainer.innerHTML = '';
                this.projectListContainer.style.display = 'none';
            } else {
            }
        }
    }

    renderProjects(projects) {
        this.clearProjectList();

        if (!projects || projects.length === 0) {
            if (this.noProjectsDiv) this.noProjectsDiv.style.display = 'block';
            if (this.projectListContainer) this.projectListContainer.style.display = 'none';
            return;
        }

        if (this.noProjectsDiv) this.noProjectsDiv.style.display = 'none';
        if (this.projectListContainer) this.projectListContainer.style.display = 'grid';

        projects.forEach(project => {
            this._renderSingleProjectCard(project, project.id);
        });
    }

    clearProjectList() {
        if (this.projectListContainer) this.projectListContainer.innerHTML = '';
    }

    _renderSingleProjectCard(projectData, projectId) {
        if (!this.projectListContainer) return;

        const card = document.createElement('article');
        card.classList.add('project-card');
        card.dataset.projectId = projectId;

        const workerCount = projectData.workers?.length || 0;
        const taskCount = projectData.tasks?.length || 0;
        const startDateFormatted = projectData.startDate || 'Не вказано';
        const statusText = projectData.status || 'Невідомо';
        const statusClass = `status-${(projectData.status || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;

        const detailsPagePath = `/html/projectDetails.html?id=${projectId}`;


        card.innerHTML = `
    <div class="project-card-content">
        <h3><a href="${detailsPagePath}">${projectData.name || 'Без назви'}</a></h3>
        <p><strong>Статус:</strong> <span class="project-status ${statusClass}">${statusText}</span></p>
        <p><small><strong>Початок:</strong> <span class="project-start-date">${startDateFormatted}</span></small></p>
        <p><small><strong>Робітників:</strong> <span class="project-worker-count">${workerCount}</span></small></p>
        <p><small><strong>Завдань:</strong> <span class="project-task-count">${taskCount}</span></small></p>
        <div class="project-card-actions">
            <button class="button-delete delete-project-btn" data-id="${projectId}" data-name="${projectData.name || 'Цей проект'}">Видалити</button>
        </div>
    </div>
`;
        this.projectListContainer.appendChild(card);

    }

    showLoadingError(message = "Не вдалося завантажити проекти.") {
        if (this.projectListContainer) {
            this.projectListContainer.innerHTML = `<p style="color: #ffffff; text-align: center;">${message}</p>`;
            this.projectListContainer.style.display = 'block';
        }
        if (this.noProjectsDiv) this.noProjectsDiv.style.display = 'none';
    }

    setupProjectCardListeners(deleteHandler) {
        if (!this.projectListContainer) return;
        this.projectListContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.delete-project-btn');
            if (targetButton) {
                const projectId = targetButton.dataset.id;
                const projectName = targetButton.dataset.name;
                if (projectId) {
                    deleteHandler(projectId, projectName);
                }
            }
        });
    }
}

class DashboardApp {
    constructor(firebaseAppInstance) {
        this.authService = new AuthService(firebaseAppInstance);
        this.projectService = new ProjectService(firebaseAppInstance);
        this.ui = new DashboardUI();
        this.currentUserId = null;
        console.log("DashboardApp Initialized");
    }

    init() {
        console.log("DashboardApp: init() called");
        this.authService.onAuthChange(this._handleAuthStateChange.bind(this));
        this.ui.setupProjectCardListeners(this._handleDeleteProject.bind(this));
    }

    _handleAuthStateChange(user) {
        if (user) {
            console.log("User Authenticated on Dashboard:", user.uid);
            this.currentUserId = user.uid;
            this.ui.displayUserEmail(user.email);
            this.ui.setupLogoutButton(() => this.authService.signOutUser());
            this._loadAndDisplayProjects(user.uid);
        } else {
            console.log("User Not Authenticated on Dashboard. Redirecting to login.");
            window.location.href = '../index.html';
        }
    }

    async _loadAndDisplayProjects(userId) {
        if (!userId) {
            console.error("DashboardApp: Немає userId для завантаження проектів.");
            this.ui.setLoadingState(false);
            this.ui.showLoadingError("Не вдалося визначити користувача для завантаження проектів.");
            return;
        }
        this.ui.setLoadingState(true);
        try {
            const projects = await this.projectService.getProjectsByCreator(userId);
            this.ui.renderProjects(projects);
        } catch (error) {

            this.ui.showLoadingError(`Помилка завантаження проектів: ${error.message}`);
        } finally {
            this.ui.setLoadingState(false);
        }
    }

    _handleLogout() {
        this.authService.signOutUser();
    }

    async _handleDeleteProject(projectId, projectName) {
        if (!this.currentUserId) {
            alert("Помилка: Користувач не автентифікований.");
            return;
        }
        if (!projectId) {
            alert("Помилка: ID проекту не визначено для видалення.");
            return;
        }

        const isConfirmed = confirm(`Ви впевнені, що хочете видалити проект "${projectName}"? Ця дія незворотня.`);

        if (isConfirmed) {
            this.ui.setLoadingState(true);
            try {
                await this.projectService.deleteProject(projectId);
                console.log(`Проект "${projectName}" (ID: ${projectId}) видалено.`);
                await this._loadAndDisplayProjects(this.currentUserId);
            } catch (error) {
                console.error(`Помилка видалення проекту ${projectId}:`, error);
                alert(`Не вдалося видалити проект: ${error.message}`);
            } finally {

            }
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded for mainPage.js. Initializing DashboardApp...");
    if (document.getElementById('project-list-container')) {
        const dashboardApp = new DashboardApp(app);
        dashboardApp.init();
    } else {
        console.warn("Контейнер 'project-list-container' не знайдено, DashboardApp не ініціалізовано.");
    }
});