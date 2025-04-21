// dashboard.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const projectListContainer = document.getElementById('project-list-container');
const loadingProjectsDiv = document.getElementById('loading-projects');
const noProjectsDiv = document.getElementById('no-projects');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');

function renderProjectCard(projectData, projectId) {
    if (!projectListContainer) return;

    const card = document.createElement('article');
    card.classList.add('project-card');
    card.dataset.projectId = projectId;

    const placeholderImageUrl = '45.jpg';
    const imageUrl = (projectData.photoUrls && projectData.photoUrls.length > 0)
        ? projectData.photoUrls[0]
        : placeholderImageUrl;

    const workerCount = projectData.workers?.length || 0;
    const taskCount = projectData.tasks?.length || 0;

    const startDateFormatted = projectData.startDate || 'Не вказано';
    const statusText = projectData.status || 'Невідомо';
    const statusClass = `status-${(projectData.status || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;

    card.innerHTML = `
        <img src="${imageUrl}" alt="Фото проекту ${projectData.name || ''}" onerror="this.onerror=null; this.src='${placeholderImageUrl}';">
        <div class="project-card-content">
            <h3><a href="/project-details.html?id=${projectId}">${projectData.name || 'Без назви'}</a></h3>
            <p><strong>Статус:</strong> <span class="project-status ${statusClass}">${statusText}</span></p>
            <p><small><strong>Початок:</strong> <span class="project-start-date">${startDateFormatted}</span></small></p>
            <p><small><strong>Робітників:</strong> <span class="project-worker-count">${workerCount}</span></small></p>
            <p><small><strong>Завдань:</strong> <span class="project-task-count">${taskCount}</span></small></p>
        </div>
    `;
    projectListContainer.appendChild(card);
}

async function displayUserProjects(userId) {
    if (!projectListContainer || !loadingProjectsDiv || !noProjectsDiv) {
        console.error("Відсутні необхідні DOM елементи для відображення проектів.");
        return;
    }

    loadingProjectsDiv.style.display = 'block';
    noProjectsDiv.style.display = 'none';
    projectListContainer.innerHTML = '';

    try {
        const projectsRef = collection(db, "projects");
        const q = query(projectsRef,
            where("creatorId", "==", userId),
            orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noProjectsDiv.style.display = 'block';
        } else {
            querySnapshot.forEach((doc) => {
                renderProjectCard(doc.data(), doc.id);
            });
        }
    } catch (error) {
        console.error("Помилка отримання проектів:", error);
        projectListContainer.innerHTML = '<p style="color: red; text-align: center;">Не вдалося завантажити проекти. Перевірте консоль або спробуйте пізніше.</p>';
        if (error.code === 'permission-denied') {
            console.error("Помилка прав доступу Firestore. Перевірте правила безпеки.");
        } else if (error.code === 'failed-precondition') {
            console.error("Помилка запиту Firestore: можливо, потрібен індекс. Перевірте повідомлення в консолі.");
        }
    } finally {
        loadingProjectsDiv.style.display = 'none';
    }
}

let currentUserId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Користувач для дашборду:", user.uid);

        if (userEmailSpan) {
            userEmailSpan.textContent = user.email;
        }
        displayUserProjects(user.uid);

        if (logoutButton) {
            if (!logoutButton.dataset.listenerAttached) {
                logoutButton.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        console.log('Користувач вийшов');
                        window.location.href = 'index.html';
                    }).catch((error) => {
                        console.error('Помилка виходу:', error);
                        alert('Не вдалося вийти. Спробуйте ще раз.');
                    });
                });
                logoutButton.dataset.listenerAttached = 'true';
            }
        } else {
            console.warn("Кнопка виходу (logout-button) не знайдена.");
        }

    } else {
        currentUserId = null;
        console.log("Користувач не автентифікований, перенаправлення на логін.");
        window.location.href = 'index.html';
    }
});