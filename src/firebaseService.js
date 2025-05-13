import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

class FirebaseService {
    #app;
    #auth;
    #db;
    static instance;

    constructor() {
        if (!FirebaseService.instance) {
            const firebaseConfig = {
                apiKey: "AIzaSyBNmgSTXoabY_JhynyfxB-4KCcRvYLi6B4",
                authDomain: "constructionmanagementsy-b8e52.firebaseapp.com",
                projectId: "constructionmanagementsy-b8e52",
                storageBucket: "constructionmanagementsy-b8e52.firebasestorage.app",
                messagingSenderId: "390996667134",
                appId: "1:390996667134:web:0d99cf1ee58824195613af",
                measurementId: "G-1B0X0DGTC1"
            };
            this.#app = initializeApp(firebaseConfig);
            this.#auth = getAuth(this.#app);
            this.#db = getFirestore(this.#app);
            FirebaseService.instance = this;
        }
        return FirebaseService.instance;
    }

    getAuthInstance() {
        return this.#auth;
    }

    getFirestoreInstance() {
        return this.#db;
    }
}

const firebaseService = new FirebaseService();

export default firebaseService;