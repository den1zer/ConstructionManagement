import { jsPDF } from "jspdf";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, documentId, getDocs } from "firebase/firestore";
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
    constructor(authInstance) { this.auth = authInstance; }
    onAuthChange(callback) { return onAuthStateChanged(this.auth, callback); }
    async signOutUser() {
        try {
            await signOut(this.auth);
            console.log("Користувач вийшов.");
            window.location.href = '../index.html';
        } catch (error) { console.error('Помилка виходу:', error); }
    }
}

class TaskPlannerService {
    calculateTotals(tasks) {
        let totalDays = 0;
        let totalCost = 0;

        tasks.forEach(task => {
            if (task.calculatedTaskWorkDays) {
                totalDays += task.calculatedTaskWorkDays;
            }
            if (task.calculatedWorkTotalCost) {
                totalCost += task.calculatedWorkTotalCost;
            }
        });

        return { totalDays, totalCost };
    }

    constructor(dbInstance) {
        this.db = dbInstance;
        this.WORK_NORMS = {
            drywall_installation: { unit: 'листів/год', perPersonPerHour: 0.4, description: "Монтаж гіпсокартону" },
            spackling: { unit: 'м²/год', perPersonPerHour: 2.0, description: "Шпаклювання стін і стелі" },
            painting: { unit: 'м²/год', perPersonPerHour: 3.5, description: "Фарбування" },
            flooring_laminate: { unit: 'м²/год', perPersonPerHour: 1.5, description: "Укладання ламінату" },
            flooring_tile: { unit: 'м²/год', perPersonPerHour: 0.5, description: "Укладання плитки" },
            electrical_points: { unit: 'точок/год', perPersonPerHour: 0.6, description: "Електромонтажні роботи" }
        };
        this.WORKER_EFFICIENCY_COEFFICIENTS = { 1: 1.0, 2: 0.9, 3: 0.8, 4: 0.75, 5: 0.7 };
        this.HOURS_PER_WORK_DAY = 8;
    }

    _getNormKeyFromDescription(description) {
        const descLower = (description || "").toLowerCase();
        for (const key in this.WORK_NORMS) {
            const normDescStart = this.WORK_NORMS[key].description.toLowerCase().split(' ')[0];
            if (descLower.includes(normDescStart)) {
                return key;
            }
        }
        if (descLower.includes('гіпсокартон')) return 'drywall_installation';
        if (descLower.includes('шпаклювання')) return 'spackling';
        if (descLower.includes('фарбування')) return 'painting';
        if (descLower.includes('ламінат')) return 'flooring_laminate';
        if (descLower.includes('плитка')) return 'flooring_tile';
        if (descLower.includes('електромонтаж')) return 'electrical_points';
        return null;
    }

    _calculateTime(workVolume, normKey, numWorkers) {
        if (!workVolume || workVolume <= 0 || !normKey || !this.WORK_NORMS[normKey] || !numWorkers || numWorkers <= 0) {
            return { calculatedTaskHours: 0, calculatedTaskWorkDays: 0 };
        }
        const baseProductivity = this.WORK_NORMS[normKey].perPersonPerHour;
        const efficiency = this.WORKER_EFFICIENCY_COEFFICIENTS[numWorkers] || this.WORKER_EFFICIENCY_COEFFICIENTS[Object.keys(this.WORKER_EFFICIENCY_COEFFICIENTS).pop()] || 0.6;
        const totalProductivityPerHour = baseProductivity * numWorkers * efficiency;
        if (totalProductivityPerHour <= 0) return { calculatedTaskHours: 0, calculatedTaskWorkDays: 0 };
        const hours = workVolume / totalProductivityPerHour;
        const workDays = Math.ceil(hours / this.HOURS_PER_WORK_DAY);
        return { calculatedTaskHours: parseFloat(hours.toFixed(1)), calculatedTaskWorkDays: workDays };
    }

    async getProjectData(projectId) {
        if (!projectId) throw new Error("Project ID є обов'язковим.");
        const projectRef = doc(this.db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) throw new Error(`Проект з ID ${projectId} не знайдено.`);
        return { id: projectSnap.id, ...projectSnap.data() };
    }

    async updateProjectTasks(projectId, updatedTasksArray) {
        if (!projectId || !updatedTasksArray) throw new Error("Project ID та масив завдань є обов'язковими.");
        const projectRef = doc(this.db, "projects", projectId);
        await updateDoc(projectRef, { tasks: updatedTasksArray });
    }

    async getWorkersByIds(workerIds = []) {
        if (workerIds.length === 0) return new Map();
        const map = new Map(); const ref = collection(this.db, "workers"); const chunks=[];
        for(let i=0;i<workerIds.length;i+=30)chunks.push(workerIds.slice(i,i+30));
        for(const chunk of chunks) if(chunk.length>0){const q=query(ref,where(documentId(),"in",chunk)); const snap=await getDocs(q); snap.forEach(d=>map.set(d.id,d.data()));}
        return map;
    }

    calculateDrywallData(area, price, numWorkers) {
        const sA=3,wF=1.1;
        if(!area||area<=0)
            return{sheets:0,cost:0,...this._calculateTime(0,'drywall_installation',numWorkers)};
        const s=Math.ceil((area/sA)*wF);
        const c=s*(parseFloat(price)||0);
        const time=this._calculateTime(s,'drywall_installation',numWorkers);
        return {calculatedDrywallSheets:isNaN(s)?0:s, calculatedDrywallCost:isNaN(c)?0:c,...time};
    }
    calculateSpacklingData(area, sPrice, pPrice, layers=2, numWorkers) {
        const sC=0.8,pC=0.15;
        if(!area||area<=0)
            return{sKg:0,pL:0,sCost:0, ...this._calculateTime(0,'spackling',numWorkers)};
        const tS=area*sC*layers;
        const tP=area*pC;
        const cS=tS*(parseFloat(sPrice)||0);
        const cP=tP*(parseFloat(pPrice)||0);
        const time=this._calculateTime(area*layers,'spackling',numWorkers);
        return {
            calculatedSpackleKg:parseFloat(tS.toFixed(1)),
            calculatedPrimerL:parseFloat(tP.toFixed(1)),
            calculatedSpacklingMaterialCost:parseFloat((cS+cP).toFixed(2)),...time};
    }
    calculatePaintingData(area, paintPrice, layers=2, numWorkers)
    {
        const pC=0.12;
        if(!area||area<=0)
            return{pL:0,pCost:0, ...this._calculateTime(0,'painting',numWorkers)};
        const tP=area*pC*layers; const cP=tP*(parseFloat(paintPrice)||0);
        const time=this._calculateTime(area*layers,'painting',numWorkers);
        return {
            calculatedPaintL:parseFloat(tP.toFixed(1)),calculatedPaintingMaterialCost:parseFloat(cP.toFixed(2)),...time};
    }
    calculateFlooringData(area, materialPrice, taskDescription, numWorkers)
    {
        const wF=1.1;
        if(!area||area<=0)
            return{fSqM:0,fCost:0,...this._calculateTime(0,'flooring_laminate',numWorkers)};
        const tF=area*wF;
        const cF=tF*(parseFloat(materialPrice)||0);
        const normKey = this._getNormKeyFromDescription(taskDescription) || 'flooring_laminate';
        const time=this._calculateTime(area,normKey,numWorkers);
        return {
            calculatedFlooringSqM:parseFloat(tF.toFixed(1)),calculatedFlooringMaterialCost:parseFloat(cF.toFixed(2)),...time};
    }
    calculateElectricalWorkData(points, pricePerPoint, numWorkers)
    {
        if(!points||points<=0)
            return{eCost:0,...this._calculateTime(0,'electrical_points',numWorkers)};
        const cost=points*(parseFloat(pricePerPoint)||0);
        const time=this._calculateTime(points,'electrical_points',numWorkers);
        return {
            calculatedElectricalWorkCost:parseFloat(cost.toFixed(2)),...time};
    }
}

class TaskPlannerUI {
    constructor() {
        this.loadingDiv = document.getElementById('loading-planner');
        this.messageArea = document.getElementById('planner-message-area');
        this.taskManagementSection = document.getElementById('task-management-section');
        this.tasksDisplayArea = document.getElementById('tasks-display-area');
        this.projectNameTitleSpan = document.getElementById('planner-project-name-title');
        this.projectNameHeaderSpan = document.getElementById('header-project-name');
        this.userEmailSpan = document.getElementById('user-email');
        this.logoutButton = document.getElementById('logout-button-planner');
        this.backToDetailsLink = document.getElementById('back-to-project-details-link');
        this.headerRoomCountSpan = document.getElementById('header-room-count');
        this.headerTotalAreaSpan = document.getElementById('header-total-area');
        if (!this.tasksDisplayArea) console.error("UI Error: Елемент 'tasks-display-area' не знайдено!");
    }

    setLoading(isLoading) {
        if (this.loadingDiv) this.loadingDiv.style.display = isLoading ? 'block' : 'none';
        if (this.taskManagementSection) this.taskManagementSection.style.display = isLoading ? 'none' : 'block';
    }
    showMessage(message, type = 'info', duration = 3000) {
        if (this.messageArea) { this.messageArea.textContent = message; this.messageArea.className = `form-message message-${type}`;
            this.messageArea.style.display = 'block';
            if (duration > 0 && type !=='error') {
                setTimeout(() => {
                    if (this.messageArea && this.messageArea.textContent === message) this.messageArea.style.display = 'none'; }, duration);}}
        else { alert(`${type.toUpperCase()}: ${message}`); } }
    clearMessages() {
        if (this.messageArea)
            this.messageArea.style.display = 'none';
    }
    displayProjectHeaderInfo(projectName, roomCount, totalArea) {
        const n = projectName||"Проект";
        if(this.projectNameTitleSpan)this.projectNameTitleSpan.textContent=n;
        if(this.projectNameHeaderSpan)this.projectNameHeaderSpan.textContent=n;
        if(this.headerRoomCountSpan)this.headerRoomCountSpan.textContent=roomCount??'N/A';
        if(this.headerTotalAreaSpan)this.headerTotalAreaSpan.textContent=totalArea?.toFixed(2)??'N/A';
    }
    setupStaticLinks(projectId) {
        if(this.backToDetailsLink&&projectId) this.backToDetailsLink.href=`projectDetails.html?id=${projectId}`;
    }
    displayUserData(email) {
        if (this.userEmailSpan) this.userEmailSpan.textContent = email || '';
    }
    setupLogoutButton(logoutHandler) {
        if (this.logoutButton&&!this.logoutButton.dataset.listenerAttached){this.logoutButton.addEventListener('click',logoutHandler);
            this.logoutButton.dataset.listenerAttached = 'true';}
    }

    renderTasks(tasks = [], projectWorkersMap = new Map(), onTaskUpdateCallback) {
        if (!this.tasksDisplayArea) return;
        this.tasksDisplayArea.innerHTML = '';
        if (!tasks || tasks.length === 0) { this.tasksDisplayArea.innerHTML = '<p>Завдання не додані.</p>'; return; }
        const totals = new TaskPlannerService().calculateTotals(tasks);
        const summaryElement = document.createElement('div');
        summaryElement.id = 'task-summary';
        summaryElement.classList.add('task-summary');
        summaryElement.innerHTML = `
           <p>Загальна кількість днів: ${totals.totalDays}</p>
           <p>Загальна сума: ${totals.totalCost.toFixed(2)} грн</p>
       `;

        this.tasksDisplayArea.appendChild(summaryElement);

        tasks.forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task-item');
            const currentStatus = task.status || 'нове';
            taskElement.classList.add(`status-${currentStatus.toLowerCase().replace(/\s+/g, '_')}`);
            const taskIdentifier = task.id || index;
            const taskDescriptionLower = (task.description || "").toLowerCase();
            let specificInputsHTML = '', calculationResultsHTML = '';

            if (taskDescriptionLower.includes('гіпсокартон')) {
                specificInputsHTML = `
<div class="form-group-inline">
<label for="area-${taskIdentifier}">Площа ГКЛ(м²):</label>
<input type="number" id="area-${taskIdentifier}" class="task-param-input" value="${task.areaToCoverByDrywall||''}">
</div>
<div class="form-group-inline"><label for="sheetprice-${taskIdentifier}">Ціна/лист(грн):</label>
<input type="number" id="sheetprice-${taskIdentifier}" class="task-param-input" value="${task.drywallSheetPrice||''}">
</div>`;
                calculationResultsHTML = `
<div class="task-calculation-results">
<small>Листів:<span id="calc-sheets-${taskIdentifier}">${task.calculatedDrywallSheets||'N/A'}</span></small>,
<small>Варт.ГКЛ:<span id="calc-cost-${taskIdentifier}">${task.calculatedDrywallCost?.toFixed(2)||'N/A'}</span>грн</small></div>`;
            } else if (taskDescriptionLower.includes('шпаклювання')) {
                specificInputsHTML = `
<div class="form-group-inline">
<label for="area-spackling-${taskIdentifier}">Площа(м²):</label>
<input type="number" id="area-spackling-${taskIdentifier}" class="task-param-input" value="${task.areaToSpackle||''}">
</div><div class="form-group-inline"><label for="spackleprice-${taskIdentifier}">Ціна шпакл.(грн/кг):</label>
<input type="number" id="spackleprice-${taskIdentifier}" class="task-param-input" value="${task.spacklePricePerKg||''}"></div>
<div class="form-group-inline"><label for="primerprice-${taskIdentifier}">Ціна ґрунт.(грн/л):</label>
<input type="number" id="primerprice-${taskIdentifier}" class="task-param-input" value="${task.primerPricePerLiter||''}"></div>
<div class="form-group-inline"><label for="layers-spackling-${taskIdentifier}">Шарів:</label>
<input type="number" id="layers-spackling-${taskIdentifier}" class="task-param-input" value="${task.numSpacklingLayers||2}" min="1"></div>`;
                calculationResultsHTML = `
<div class="task-calculation-results">
<small>Шпакл:<span id="calc-spackle-${taskIdentifier}">${task.calculatedSpackleKg||'N/A'}</span>кг</small>, 
<small>Ґрунт:<span id="calc-primer-${taskIdentifier}">${task.calculatedPrimerL||'N/A'}</span>л</small>, 
<small>Варт.мат:
<span id="calc-spacklingcost-${taskIdentifier}">${task.calculatedSpacklingMaterialCost?.toFixed(2)||'N/A'}
</span>грн</small></div>`;
            } else if (taskDescriptionLower.includes('фарбування')) {
                specificInputsHTML = `
<div class="form-group-inline">
<label for="area-painting-${taskIdentifier}">Площа(м²):</label>
<input type="number" id="area-painting-${taskIdentifier}" class="task-param-input" value="${task.areaToPaint||''}">
</div>
<div class="form-group-inline">
<label for="paintprice-${taskIdentifier}">Ціна фарби(грн/л):</label>
<input type="number" id="paintprice-${taskIdentifier}" class="task-param-input" value="${task.paintPricePerLiter||''}"></div>
<div class="form-group-inline"><label for="layers-painting-${taskIdentifier}">Шарів:</label>
<input type="number" id="layers-painting-${taskIdentifier}" class="task-param-input" value="${task.numPaintingLayers||2}" min="1"></div>`;
                calculationResultsHTML = `
<div class="task-calculation-results">
<small>Фарби:<span id="calc-paint-${taskIdentifier}">${task.calculatedPaintL||'N/A'}</span>л</small>, 
<small>Варт.фарби:<span id="calc-paintcost-${taskIdentifier}">${task.calculatedPaintingMaterialCost?.toFixed(2)||'N/A'}</span>
грн</small></div>`;
            } else if (taskDescriptionLower.includes('ламінат') || taskDescriptionLower.includes('плитка')) {
                specificInputsHTML = `
<div class="form-group-inline">
<label for="area-flooring-${taskIdentifier}">Площа підлоги(м²):</label>
<input type="number" id="area-flooring-${taskIdentifier}" class="task-param-input" value="${task.areaToFloor||''}"></div>
<div class="form-group-inline"><label for="floorprice-${taskIdentifier}">Ціна мат.(грн/м²):</label>
<input type="number" id="floorprice-${taskIdentifier}" class="task-param-input" value="${task.flooringMaterialPricePerSqM||''}"></div>`;
                calculationResultsHTML = `
<div class="task-calculation-results">
<small>Матеріалу:<span id="calc-flooring-${taskIdentifier}">${task.calculatedFlooringSqM||'N/A'}</span>м²</small>, 
<small>Варт.мат:<span id="calc-floorcost-${taskIdentifier}">${task.calculatedFlooringMaterialCost?.toFixed(2)||'N/A'}</span>грн</small></div>`;
            } else if (taskDescriptionLower.includes('електромонтаж')) {
                specificInputsHTML = `
<div class="form-group-inline">
<label for="points-${taskIdentifier}">К-сть точок:</label>
<input type="number" id="points-${taskIdentifier}" class="task-param-input" value="${task.numElectricalPoints||''}"></div>
<div class="form-group-inline">
<label for="workprice-point-${taskIdentifier}">Ціна/точка(робота,грн):</label>
<input type="number" id="workprice-point-${taskIdentifier}" class="task-param-input" value="${task.electricalWorkPricePerPoint||''}"></div>`;
                calculationResultsHTML = `
<div class="task-calculation-results">
<small>Варт.робіт:<span id="calc-electricalcost-${taskIdentifier}">${task.calculatedElectricalWorkCost?.toFixed(2)||'N/A'}</span>грн</small></div>`;
            }

            const timeResultsHTML = `
<div class="task-time-results"><small>Годин:<span id="calc-hours-${taskIdentifier}">${task.calculatedTaskHours||'N/A'}</span></small>,
 <small>Днів:<span id="calc-days-${taskIdentifier}">${task.calculatedTaskWorkDays||'N/A'}</span></small></div>`;


            let workersSelectHTML = `
<select id="assign-workers-${taskIdentifier}" class="task-assign-workers-select task-input" multiple size="3">`;
            if (projectWorkersMap.size > 0) {
                projectWorkersMap.forEach((wd, wId) => {
                    const iA = task.assignedWorkerIds?.includes(wId); workersSelectHTML += `<option value="${wId}" ${iA?'selected':''}>${wd.name||wId}</option>`;}); }
            else { workersSelectHTML += `<option disabled>Робітники відсутні</option>`; }
            workersSelectHTML += `</select><small>Ctrl+клік</small>`;


            taskElement.innerHTML = `
                <p class="task-description">${index + 1}. ${task.description || 'Без опису'}</p>
                <div class="task-specific-inputs">${specificInputsHTML}</div>
                ${calculationResultsHTML}
                <div class="form-group-inline">
                    <label for="workprice-${taskIdentifier}">Ціна роботи(грн/год):</label>
                    <input type="number" id="workprice-${taskIdentifier}" class="task-work-price-input task-input" value="${task.workPricePerHour || ''}">
                </div>
                <div id="calc-workcost-result-${taskIdentifier}" class="task-work-cost-results">
                     <small>Вартість роботи: <span id="calc-workcost-${taskIdentifier}">${task.calculatedWorkTotalCost?.toFixed(2)||'N/A'}</span>грн</small>
                </div>
                ${timeResultsHTML}
                <div class="task-controls">
                    <div class="form-group-inline">
                    <label for="status-${taskIdentifier}">Статус:</label>
                    <select id="status-${taskIdentifier}" class="task-status-select task-input">
                    <option value="нове" ${currentStatus==='нове'?'selected':''}>Нове</option>
                    <option value="в_роботі" ${currentStatus==='в_роботі'?'selected':''}>В роботі</option>
                    <option value="виконано" ${currentStatus==='виконано'?'selected':''}>Виконано</option>
                    <option value="не_почате" ${currentStatus==='не_почате'?'selected':''}>Не почате</option></select></div>
                    <div class="form-group-inline">
                    <label for="assign-workers-${taskIdentifier}">Призначити:</label>${workersSelectHTML}</div>
                    <button type="button" class="button-save-task-changes task-input" data-task-identifier="${taskIdentifier}">Зберегти</button>
                </div>`;
            this.tasksDisplayArea.appendChild(taskElement);

            const saveButton = taskElement.querySelector('.button-save-task-changes');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    const newStatus = taskElement.querySelector(`#status-${taskIdentifier}`)?.value;
                    const selectedWorkerIds = taskElement.querySelector(`#assign-workers-${taskIdentifier}`) ?
                        Array.from(taskElement.querySelector(`#assign-workers-${taskIdentifier}`).selectedOptions).map(opt => opt.value).filter(v => v) : [];
                    let taskSpecificData = { status: newStatus, assignedWorkerIds: selectedWorkerIds };
                    const workPriceInput = taskElement.querySelector(`#workprice-${taskIdentifier}`);
                    if(workPriceInput) taskSpecificData.workPricePerHour = parseFloat(workPriceInput.value) || 0;

                    if (taskDescriptionLower.includes('гіпсокартон')) {
                        const areaInput = taskElement.querySelector(`#area-${taskIdentifier}`);
                        const priceInput = taskElement.querySelector(`#sheetprice-${taskIdentifier}`);
                        if(areaInput) taskSpecificData.areaToCoverByDrywall = parseFloat(areaInput.value) || 0;
                        if(priceInput) taskSpecificData.drywallSheetPrice = parseFloat(priceInput.value) || 0;
                    }
                    else if (taskDescriptionLower.includes('шпаклювання')) {
                        const areaInput=taskElement.querySelector(`#area-spackling-${taskIdentifier}`);
                        const spacklePriceInput=taskElement.querySelector(`#spackleprice-${taskIdentifier}`);
                        const primerPriceInput=taskElement.querySelector(`#primerprice-${taskIdentifier}`);
                        const layersInput=taskElement.querySelector(`#layers-spackling-${taskIdentifier}`);
                        if(areaInput)taskSpecificData.areaToSpackle=parseFloat(areaInput.value)||0;
                        if(spacklePriceInput)taskSpecificData.spacklePricePerKg=parseFloat(spacklePriceInput.value)||0;
                        if(primerPriceInput)taskSpecificData.primerPricePerLiter=parseFloat(primerPriceInput.value)||0;
                        if(layersInput)taskSpecificData.numSpacklingLayers=parseInt(layersInput.value)||2;
                    }
                    else if (taskDescriptionLower.includes('фарбування')) {
                        const areaInput=taskElement.querySelector(`#area-painting-${taskIdentifier}`);
                        const paintPriceInput=taskElement.querySelector(`#paintprice-${taskIdentifier}`);
                        const layersInput=taskElement.querySelector(`#layers-painting-${taskIdentifier}`);
                        if(areaInput)taskSpecificData.areaToPaint=parseFloat(areaInput.value)||0;
                        if(paintPriceInput)taskSpecificData.paintPricePerLiter=parseFloat(paintPriceInput.value)||0;
                        if(layersInput)taskSpecificData.numPaintingLayers=parseInt(layersInput.value)||2;
                    }
                    else if (taskDescriptionLower.includes('ламінат') || taskDescriptionLower.includes('плитк')) {
                        const areaInput=taskElement.querySelector(`#area-flooring-${taskIdentifier}`);
                        const floorPriceInput=taskElement.querySelector(`#floorprice-${taskIdentifier}`);
                        if(areaInput)taskSpecificData.areaToFloor=parseFloat(areaInput.value)||0;
                        if(floorPriceInput)taskSpecificData.flooringMaterialPricePerSqM=parseFloat(floorPriceInput.value)||0;
                    }
                    else if (taskDescriptionLower.includes('електромонтаж')) {
                        const pointsInput=taskElement.querySelector(`#points-${taskIdentifier}`);
                        const workPricePointInput=taskElement.querySelector(`#workprice-point-${taskIdentifier}`);
                        if(pointsInput)taskSpecificData.numElectricalPoints=parseInt(pointsInput.value)||0;
                        if(workPricePointInput)taskSpecificData.electricalWorkPricePerPoint=parseFloat(workPricePointInput.value)||0;
                    }

                    onTaskUpdateCallback(taskIdentifier, taskSpecificData);
                });
            } else { console.error(`Кнопка .button-save-task-changes не знайдена для taskIdentifier ${taskIdentifier}`); }
        });
    }

}

class TaskPlannerApp {
    constructor() {
        this.authService = new AuthService(firebaseAuthInstance);
        this.plannerService = new TaskPlannerService(firestoreDbInstance);
        this.ui = new TaskPlannerUI();
        this.projectId = this._getProjectIdFromUrl();
        this.currentProjectData = null;
        this.projectWorkersMap = new Map();
    }
    _getProjectIdFromUrl() {
        const p = new URLSearchParams(window.location.search);
        return p.get('id');
    }
    init() {
        if (!this.projectId) {
            this.ui.setLoading(false); this.ui.showMessage("ID проекту не знайдено.", "error",0);
            return;
        }
        this.ui.setupStaticLinks(this.projectId);
        this.authService.onAuthChange(async (u) => {
            if(u){this.ui.displayUserData(u.email);
                this.ui.setupLogoutButton(()=>this.authService.signOutUser());
                await this.loadInitialData();}
            else {window.location.href='../index.html';}});
    }
    _calculateProjectAreas(rooms = []) {
        let wA=0,cA=0; (rooms||[]).forEach(r=>{
            const l=parseFloat(r.length)||0,wd=parseFloat(r.width)||0,h=parseFloat(r.height)||0;
            if(l>0&&wd>0&&h>0){const fa=l*wd;cA+=fa;wA+=2*(l+wd)*h;}});
        return {roomCount:(rooms||[]).length, totalSurfaceArea:wA+cA};
    }
    async loadInitialData() {
        this.ui.setLoading(true);
        this.ui.clearMessages();
        try {
            const pD = await this.plannerService.getProjectData(this.projectId);
            this.currentProjectData = pD;
            const areas = this._calculateProjectAreas(pD.rooms);
            this.ui.displayProjectHeaderInfo(pD.name,areas.roomCount,areas.totalSurfaceArea);
            this.projectWorkersMap.clear();
            if(pD.workers?.length>0){
                const wIds=pD.workers.map(w=>w.id).filter(id=>id);
                if(wIds.length>0)
                    this.projectWorkersMap=await this.plannerService.getWorkersByIds(wIds);
            }
            this.ui.renderTasks(
                pD.tasks||[],this.projectWorkersMap,this._handleTaskUpdate.bind(this));
            if(this.ui.taskManagementSection)this.ui.taskManagementSection.style.display='block';
        } catch(e){
            console.error("Помилка loadInitialData:",e);
            if(this.ui)this.ui.showMessage(e.message,"error",0);
            if(this.ui?.taskManagementSection)this.ui.taskManagementSection.style.display='none';
        } finally {if(this.ui)this.ui.setLoading(false);
        }
    }

    async _handleTaskUpdate(taskIdentifier, userInputFields) {
        if (!this.currentProjectData || !this.currentProjectData.tasks) {
            this.ui.showMessage("Помилка: дані проекту не завантажені.", "error");
            return;
        }

        let taskIndex = typeof taskIdentifier === 'number'
            ? taskIdentifier
            : this.currentProjectData.tasks.findIndex(t => t.id === taskIdentifier);

        if (taskIndex === -1) {
            console.error("Завдання для оновлення не знайдено:", taskIdentifier);
            this.ui.showMessage("Помилка: завдання не знайдено.", "error");
            return;
        }

        const oldTask = this.currentProjectData.tasks[taskIndex];
        let updatedTask = { ...oldTask, ...userInputFields };
        const descLower = (updatedTask.description || "").toLowerCase();
        const numWorkers = updatedTask.assignedWorkerIds?.length || 1;
        let timeCalculationResult = null;

        const calcFieldsToClear = [
            'calculatedDrywallSheets', 'calculatedDrywallCost',
            'calculatedSpackleKg', 'calculatedPrimerL', 'calculatedSpacklingMaterialCost',
            'calculatedPaintL', 'calculatedPaintingMaterialCost',
            'calculatedFlooringSqM', 'calculatedFlooringMaterialCost',
            'calculatedElectricalWorkCost', 'calculatedTaskHours',
            'calculatedTaskWorkDays', 'calculatedWorkTotalCost',
            'totalTaskCost'
        ];
        calcFieldsToClear.forEach(field => updatedTask[field] = null);

        let timeCalc = { calculatedTaskHours: 0, calculatedTaskWorkDays: 0 };

        if (descLower.includes('гіпсокартон')) {
            const calc = this.plannerService.calculateDrywallData(
                updatedTask.areaToCoverByDrywall, updatedTask.drywallSheetPrice, numWorkers
            );
            updatedTask = { ...updatedTask, ...calc };
            timeCalc = calc;

        } else if (descLower.includes('шпаклювання')) {
            const calc = this.plannerService.calculateSpacklingData(
                updatedTask.areaToSpackle, updatedTask.spacklePricePerKg,
                updatedTask.primerPricePerLiter, updatedTask.numSpacklingLayers, numWorkers
            );
            updatedTask = { ...updatedTask, ...calc };
            timeCalc = calc;

        } else if (descLower.includes('фарбування')) {
            const calc = this.plannerService.calculatePaintingData(
                updatedTask.areaToPaint, updatedTask.paintPricePerLiter,
                updatedTask.numPaintingLayers, numWorkers
            );
            updatedTask = { ...updatedTask, ...calc };
            timeCalc = calc;

        } else if (descLower.includes('ламінат') || descLower.includes('плитка')) {
            const type = descLower.includes('плитка') ? 'tile' : 'laminate';
            const calc = this.plannerService.calculateFlooringData(
                updatedTask.areaToFloor, updatedTask.flooringMaterialPricePerSqM,
                type, numWorkers
            );
            updatedTask = { ...updatedTask, ...calc };
            timeCalc = calc;

        } else if (descLower.includes('електромонтаж')) {
            const calc = this.plannerService.calculateElectricalWorkData(
                updatedTask.numElectricalPoints, updatedTask.electricalWorkPricePerPoint, numWorkers
            );
            updatedTask = { ...updatedTask, ...calc };
            timeCalc = calc;
        }

        let materialCost = 0;
        if (descLower.includes('гіпсокартон')) materialCost = updatedTask.calculatedDrywallCost || 0;
        else if (descLower.includes('шпаклювання')) materialCost = updatedTask.calculatedSpacklingMaterialCost || 0;
        else if (descLower.includes('фарбування')) materialCost = updatedTask.calculatedPaintingMaterialCost || 0;
        else if (descLower.includes('ламінат') || descLower.includes('плитка')) materialCost = updatedTask.calculatedFlooringMaterialCost || 0;
        else if (descLower.includes('електромонтаж')) materialCost = updatedTask.calculatedElectricalWorkCost || 0;

        const workCost = timeCalc.calculatedTaskHours > 0 && (updatedTask.workPricePerHour !== null && updatedTask.workPricePerHour !== undefined)
            ? timeCalc.calculatedTaskHours * (parseFloat(updatedTask.workPricePerHour) || 0)
            : 0;

        updatedTask.calculatedWorkTotalCost = workCost;
        updatedTask.totalTaskCost = materialCost + workCost;

        for (const k in updatedTask) if (updatedTask[k] === undefined) updatedTask[k] = null;
        if (updatedTask.assignedWorkerIds === undefined) updatedTask.assignedWorkerIds = [];

        const updatedTasksArray = [...this.currentProjectData.tasks];
        updatedTasksArray[taskIndex] = updatedTask;

        this.ui.showMessage("Оновлення...", "info", 0);
        try {
            await this.plannerService.updateProjectTasks(this.projectId, updatedTasksArray);
            this.currentProjectData.tasks = updatedTasksArray;
            this.ui.renderTasks(this.currentProjectData.tasks, this.projectWorkersMap, this._handleTaskUpdate.bind(this));
            this.ui.showMessage("Завдання оновлено!", "success");
        } catch (e) {
            console.error("Помилка оновлення Firestore:", e);
            this.ui.showMessage(`Не вдалося оновити: ${e.message}`, "error");
        }
    }

}

async function loadAndSetCyrillicFont(pdfInstance) {
    const fontURL = '../resources/NotoSans-VariableFont_wdth,wght.ttf';
    const FONT_NAME_IN_PDF = "MyCyrillicFont";
    const FONT_FILENAME_IN_VFS = "MyCyrillicFont.ttf";

    try {
        console.log(`Спроба завантажити шрифт з: ${fontURL}`);
        const response = await fetch(fontURL);
        if (!response.ok) {
            throw new Error(`Помилка завантаження шрифту: ${response.status} ${response.statusText} за шляхом ${fontURL}`);
        }
        const fontArrayBuffer = await response.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(fontArrayBuffer);
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const fontBase64 = btoa(binary);
        pdfInstance.addFileToVFS(FONT_FILENAME_IN_VFS, fontBase64);
        pdfInstance.addFont(FONT_FILENAME_IN_VFS, FONT_NAME_IN_PDF, "normal");
        console.log(`Шрифт '${FONT_NAME_IN_PDF}' успішно підготовлено.`);
        return FONT_NAME_IN_PDF;
    } catch (error) {
        console.error("ПОМИЛКА завантаження/додавання кириличного шрифту:", error);
        alert("Помилка завантаження шрифту для PDF. Українські літери можуть не відображатися. Перевірте консоль та шлях до файлу шрифту.");
        return "Helvetica";
    }
}

async function generatePDF(tasksForReport, projectName = "Звіт_про_проєкт") {
    const pdf = new jsPDF();
    const activeFontName = await loadAndSetCyrillicFont(pdf);
    pdf.setFont(activeFontName);

    if (activeFontName === "Helvetica") {
        console.warn("УВАГА: PDF генерується зі стандартним шрифтом Helvetica, кирилиця буде некоректною!");
    }

    const STR_REPORT_TITLE_PREFIX = "Звіт:";
    const STR_COL_NUM = "№";
    const STR_COL_TASK_NAME = "Назва завдання";
    const STR_COL_MATERIALS = "Матеріали (грн)";
    const STR_COL_WORK = "Робота (грн)";
    const STR_COL_DAYS = "Дні";
    const STR_SUMMARY_TITLE = "Загальні підсумки:";
    const STR_SUMMARY_MATERIALS_TOTAL = "Загальна вартість матеріалів:";
    const STR_SUMMARY_WORK_TOTAL = "Загальна вартість роботи:";
    const STR_SUMMARY_DAYS_TOTAL = "Загальна тривалість (дні):";
    const STR_CURRENCY = "грн";
    const STR_DAYS_UNIT = "дн.";

    function addText(text, x, y, options) {
        pdf.setFont(activeFontName);
        pdf.text(text, x, y, options);
    }

    function setFontSizeAndStyle(size, style = 'normal') {
        pdf.setFontSize(size);
        pdf.setFont(activeFontName, style);
    }

    setFontSizeAndStyle(18);
    const reportTitleText = `${STR_REPORT_TITLE_PREFIX} ${projectName}`;
    const titleWidth = pdf.getTextWidth(reportTitleText);
    const pageWidthForTitle = pdf.internal.pageSize.width;
    addText(reportTitleText, (pageWidthForTitle - titleWidth) / 2, 22);

    let yPosition = 35;
    const rowHeight = 8;
    const pageHeight = pdf.internal.pageSize.height;
    const bottomMargin = 20;

    function addPageHeader() {
        setFontSizeAndStyle(10, 'normal');
        addText(STR_COL_NUM, 14, yPosition);
        addText(STR_COL_TASK_NAME, 25, yPosition);
        addText(STR_COL_MATERIALS, 100, yPosition);
        addText(STR_COL_WORK, 135, yPosition);
        addText(STR_COL_DAYS, 170, yPosition);
        yPosition += rowHeight;
    }

    addPageHeader();
    setFontSizeAndStyle(9);

    let totalMaterials = 0;
    let totalWork = 0;
    let totalDays = 0;

    (tasksForReport || []).forEach((task, index) => {
        if (yPosition > pageHeight - bottomMargin - (rowHeight * 2)) {
            pdf.addPage();
            yPosition = 20;
            pdf.setFont(activeFontName);
            addPageHeader();
            setFontSizeAndStyle(9);
        }

        const taskNameString = String(task.taskName || "Без назви");
        const taskNameText = pdf.splitTextToSize(taskNameString, 65);

        addText(String(index + 1), 14, yPosition);
        addText(taskNameText, 25, yPosition);

        addText((Number(task.materialCost) || 0).toFixed(2), 115, yPosition, { align: 'right' });
        addText((Number(task.workCost) || 0).toFixed(2), 150, yPosition, { align: 'right' });
        addText(String(Number(task.calculatedTaskWorkDays) || 0), 175, yPosition, { align: 'center' });

        totalMaterials += Number(task.materialCost) || 0;
        totalWork += Number(task.workCost) || 0;
        totalDays += Number(task.calculatedTaskWorkDays) || 0;

        const textBlockLineHeight = pdf.getLineHeight() / pdf.internal.scaleFactor * 0.68;
        const textBlockHeight = Array.isArray(taskNameText) ? taskNameText.length * textBlockLineHeight : rowHeight;
        yPosition += Math.max(rowHeight, textBlockHeight) + 2;
    });

    if (yPosition > pageHeight - bottomMargin - (5 * rowHeight)) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFont(activeFontName);
    }

    yPosition += rowHeight;
    setFontSizeAndStyle(12, 'bold');
    addText(STR_SUMMARY_TITLE, 14, yPosition);
    yPosition += rowHeight;

    setFontSizeAndStyle(10);
    addText(`${STR_SUMMARY_MATERIALS_TOTAL} ${totalMaterials.toFixed(2)} ${STR_CURRENCY}`, 14, yPosition);
    yPosition += rowHeight;
    addText(`${STR_SUMMARY_WORK_TOTAL} ${totalWork.toFixed(2)} ${STR_CURRENCY}`, 14, yPosition);
    yPosition += rowHeight;
    addText(`${STR_SUMMARY_DAYS_TOTAL} ${totalDays} ${STR_DAYS_UNIT}`, 14, yPosition);

    let safeProjectName = String(projectName || "Project_Report")
        .replace(/[^\p{L}\p{N}\s_.-]/gu, '_')
        .replace(/\s+/g, '_');
    if (!safeProjectName || safeProjectName.length === 0 || /^_+$/.test(safeProjectName)) {
        safeProjectName = "Project_Report";
    }
    const filename = `${safeProjectName}_${new Date().toISOString().slice(0,10)}.pdf`;

    pdf.save(filename);
}

async function fetchTasks(projectId) {
    const tasks = [];
    try {
        const tasksQuery = query(
            collection(firestoreDbInstance, "tasks"),
            where("projectId", "==", projectId)
        );
        const querySnapshot = await getDocs(tasksQuery);

        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error("Помилка завантаження завдань:", error);
    }
    return tasks;
}

document.getElementById("generate-report-btn").addEventListener("click", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("ID проєкту не знайдено в URL. Неможливо згенерувати звіт.");
        return;
    }

    try {
        const projectRef = doc(firestoreDbInstance, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            alert(`Проєкт з ID ${projectId} не знайдено.`);
            return;
        }

        const projectData = projectSnap.data();
        const tasksFromProject = projectData.tasks || [];
        const currentProjectName = projectData.name || "Невідомий_проєкт";

        if (!tasksFromProject || tasksFromProject.length === 0) {
            alert("У цьому проєкті немає завдань для генерації звіту.");
            return;
        }

        const mappedTasksForPDF = tasksFromProject.map(task => {
            const workCost = parseFloat(task.calculatedWorkTotalCost) || 0;
            const totalTaskCost = parseFloat(task.totalTaskCost) || 0;
            let materialCost = totalTaskCost - workCost;

            if (materialCost < 0 || isNaN(materialCost) || !isFinite(materialCost)) {
                const descLower = (task.description || "").toLowerCase();
                if (descLower.includes('гіпсокартон') && task.calculatedDrywallCost !== undefined && task.calculatedDrywallCost !== null) {
                    materialCost = parseFloat(task.calculatedDrywallCost);
                } else if (descLower.includes('шпаклювання') && task.calculatedSpacklingMaterialCost !== undefined && task.calculatedSpacklingMaterialCost !== null) {
                    materialCost = parseFloat(task.calculatedSpacklingMaterialCost);
                } else if (descLower.includes('фарбування') && task.calculatedPaintingMaterialCost !== undefined && task.calculatedPaintingMaterialCost !== null) {
                    materialCost = parseFloat(task.calculatedPaintingMaterialCost);
                } else if ((descLower.includes('ламінат') || descLower.includes('плитка')) && task.calculatedFlooringMaterialCost !== undefined && task.calculatedFlooringMaterialCost !== null) {
                    materialCost = parseFloat(task.calculatedFlooringMaterialCost);
                } else if (descLower.includes('електромонтаж')) {
                    materialCost = 0;
                } else {
                    materialCost = 0;
                }
                materialCost = isNaN(materialCost) ? 0 : materialCost;
            }

            return {
                taskName: task.description || "Без опису",
                materialCost: materialCost,
                workCost: workCost,
                calculatedTaskWorkDays: parseInt(task.calculatedTaskWorkDays) || 0
            };
        });

        if (mappedTasksForPDF.length > 0) {
            await generatePDF(mappedTasksForPDF, currentProjectName);
        } else {
            alert("Немає підготовлених завдань для генерації звіту після обробки.");
        }

    } catch (error) {
        console.error("Помилка при генерації PDF:", error);
        alert("Сталася помилка при генерації звіту: " + error.message);
    }
})

document.addEventListener('DOMContentLoaded', () => {
    console.log("taskPlanner.js: DOMContentLoaded спрацював.");
    if (document.getElementById('task-management-section')) {
        const appInstance = new TaskPlannerApp();
        appInstance.init();
    } else {
        console.warn("Елемент 'task-management-section' не знайдено, TaskPlannerApp не ініціалізовано.");
    }
});
