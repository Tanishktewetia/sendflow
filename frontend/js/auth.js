// Authentication Logic

function toggleForms() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.querySelector('#loginForm input[type="email"]').value;
        const password = document.querySelector('#loginForm input[type="password"]').value;

        const user = {
            email,
            password,
            loggedIn: true,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = 'app.html';
    });

    // Register form handler
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const inputs = document.querySelectorAll('#registerForm input');
        const name = inputs[0].value;
        const email = inputs[1].value;
        const password = inputs[2].value;
        const confirmPassword = inputs[3].value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        const user = {
            name,
            email,
            password,
            loggedIn: true,
            isNewUser: true,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = 'app.html';
    });
});
