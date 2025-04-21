
const firebaseConfig = {

    apiKey: "AIzaSyBNmgSTXoabY_JhynyfxB-4KCcRvYLi6B4",

    authDomain: "constructionmanagementsy-b8e52.firebaseapp.com",

    projectId: "constructionmanagementsy-b8e52",

    storageBucket: "constructionmanagementsy-b8e52.firebasestorage.app",

    messagingSenderId: "390996667134",

    appId: "1:390996667134:web:0d99cf1ee58824195613af",

    measurementId: "G-1B0X0DGTC1"

};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const authErrorDiv = document.getElementById('auth-error');


loginButton.addEventListener('click', (e) => {
    e.preventDefault();

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;


    authErrorDiv.textContent = '';
    authErrorDiv.style.color = 'red';


    if (!email || !password) {
        authErrorDiv.textContent = 'Будь ласка, введіть email та пароль.';
        return;
    }


    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {

            const user = userCredential.user;
            console.log('Успішний вхід для користувача:', user.email);
            authErrorDiv.textContent = 'Вхід виконано успішно!';
            authErrorDiv.style.color = 'green';

             window.location.href = 'dashboard.html';

        })
        .catch((error) => {

            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Помилка входу:', errorCode, errorMessage);


            let friendlyMessage = 'Помилка входу. ';
            if (errorCode === 'auth/invalid-email') {
                friendlyMessage += 'Неправильний формат email.';
            } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {

                friendlyMessage += 'Неправильний email або пароль.';
            } else {
                friendlyMessage += 'Спробуйте ще раз або зверніться до адміністратора.';
            }
            authErrorDiv.textContent = friendlyMessage;
        });
});