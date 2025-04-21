import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);

const addProjectForm = document.getElementById('add-project-form');
const projectNameInput = document.getElementById('project-name');
const projectDescriptionInput = document.getElementById('project-description');
const roomCountInput = document.getElementById('room-count');
const roomsContainer = document.getElementById('rooms-container');
const projectPhotosInput = document.getElementById('project-photos');
const projectTasksList = document.getElementById('project-tasks-list');
const existingWorkersSelect = document.getElementById('existing-workers');
const projectWorkersList = document.getElementById('project-workers-list');
const ownerNameInput = document.getElementById('owner-name');
const ownerPhoneInput = document.getElementById('owner-contact-phone');
const ownerEmailInput = document.getElementById('owner-contact-email');
const projectStartDateInput = document.getElementById('project-start-date');
const projectInitialStatusSelect = document.getElementById('project-initial-status');
const saveProjectButton = document.getElementById('save-project-button');
const loadingIndicator = document.getElementById('loading-indicator');
const messageDiv = document.getElementById('form-message');

let currentUserId = null;

function setLoading(isLoading) {
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    if (saveProjectButton) {
        saveProjectButton.disabled = isLoading;
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

function getRoomData() {
    const rooms = [];
    const roomEntries = roomsContainer.querySelectorAll('.room-entry');
    roomEntries.forEach((entry, index) => {
        const lengthInput = entry.querySelector(`input[name="roomLengths[]"]`);
        const widthInput = entry.querySelector(`input[name="roomWidths[]"]`);
        const notesInput = entry.querySelector(`input[name="roomNotes[]"]`);
        rooms.push({
            roomNumber: index + 1,
            length: lengthInput ? parseFloat(lengthInput.value) || 0 : 0,
            width: widthInput ? parseFloat(widthInput.value) || 0 : 0,
            notes: notesInput ? notesInput.value : ''
        });
    });
    return rooms;
}

function getTaskData() {
    const tasks = [];
    const standardCheckboxes = addProjectForm.querySelectorAll('input[name="standardTasks[]"]:checked');
    standardCheckboxes.forEach(checkbox => {
        tasks.push({ name: checkbox.value, type: 'standard' });
    });
    const customTaskItems = projectTasksList.querySelectorAll('li');
    customTaskItems.forEach(item => {
        const taskName = item.firstChild.textContent.trim();
        if (taskName) {
            tasks.push({ name: taskName, type: 'custom' });
        }
    });
    return tasks;
}

function getWorkerData() {
    if (!existingWorkersSelect) {
        console.error("Елемент existing-workers не знайдено!");
        return [];
    }
    const selectedWorkers = Array.from(existingWorkersSelect.selectedOptions)
        .map(option => ({ id: option.value, name: option.textContent }));
    return selectedWorkers;
}

async function uploadPhotos(fileList, userId) {
    if (!fileList || fileList.length === 0) {
        return [];
    }
    const uploadPromises = [];
    const timestamp = Date.now();
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const filePath = `projectPhotos/${userId}/${timestamp}_${i}_${file.name}`;
        const fileRef = ref(storage, filePath);
        const uploadPromise = uploadBytes(fileRef, file)
            .then(snapshot => getDownloadURL(snapshot.ref))
            .catch(error => {
                console.error(`Помилка завантаження файлу ${file.name}:`, error);
                return null;
            });
        uploadPromises.push(uploadPromise);
    }
    const urls = await Promise.all(uploadPromises);
    return urls.filter(url => url !== null);
}

async function loadWorkersIntoSelect() {
    if (!existingWorkersSelect) return;
    existingWorkersSelect.innerHTML = '<option disabled>(Завантаження...)</option>';
    try {
        const workersCollectionRef = collection(db, "workers");
        const q = query(workersCollectionRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        existingWorkersSelect.innerHTML = '';
        if (querySnapshot.empty) {
            existingWorkersSelect.innerHTML = '<option disabled>Робітників не знайдено</option>';
        } else {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = "";
            placeholderOption.textContent = "-- Виберіть робітників (необов'язково) --";
            existingWorkersSelect.appendChild(placeholderOption);

            querySnapshot.forEach((doc) => {
                const worker = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${worker.name} (${worker.specialty || 'без спеціальності'})`;
                existingWorkersSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Помилка завантаження списку робітників:", error);
        existingWorkersSelect.innerHTML = '<option disabled>Помилка завантаження</option>';
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Користувач автентифікований:", currentUserId);
        if(saveProjectButton) saveProjectButton.disabled = false;
        loadWorkersIntoSelect();
    } else {
        currentUserId = null;
        console.log("Користувач не автентифікований.");
        if(saveProjectButton) saveProjectButton.disabled = true;
        if (existingWorkersSelect) {
            existingWorkersSelect.innerHTML = '<option disabled>(Увійдіть для завантаження)</option>';
        }
    }
});

addProjectForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUserId) {
        showMessage("Помилка: Не вдалося визначити користувача. Будь ласка, оновіть сторінку або увійдіть знову.", "error");
        return;
    }

    setLoading(true);
    showMessage("Збереження проекту...", "info");

    try {
        const projectName = projectNameInput.value;
        const projectDescription = projectDescriptionInput.value;
        const ownerInfo = { };
        const projectStartDate = projectStartDateInput.value;
        const initialStatus = projectInitialStatusSelect.value;
        const roomsData = getRoomData();
        const tasksData = getTaskData();
        const workersData = getWorkerData();
        const photoFiles = projectPhotosInput.files;
        const photoUrls = await uploadPhotos(photoFiles, currentUserId);

        const projectData = {
            name: projectName,
            description: projectDescription,
            owner: { name: ownerNameInput.value, phone: ownerPhoneInput.value, email: ownerEmailInput.value },
            startDate: projectStartDate,
            status: initialStatus,
            rooms: roomsData,
            tasks: tasksData,
            workers: workersData,
            photoUrls: photoUrls,
            creatorId: currentUserId,
            createdAt: serverTimestamp()
        };

        const projectsCollectionRef = collection(db, "projects");
        const docRef = await addDoc(projectsCollectionRef, projectData);

        console.log("Проект успішно створено з ID: ", docRef.id);
        showMessage("Проект успішно створено!", "success");
        addProjectForm.reset();
        roomsContainer.innerHTML = '<p id="rooms-placeholder"><small>Поля для розмірів з\'являться тут.</small></p>';
        projectTasksList.innerHTML = ' ';
        loadWorkersIntoSelect();

    } catch (error) {
        console.error("Помилка при збереженні проекту: ", error);
        showMessage(`Помилка збереження: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
});