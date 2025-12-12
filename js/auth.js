const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

// Desktop Overlay Toggles
if (signUpButton) {
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });
}

if (signInButton) {
    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });
}

// Mobile Form Toggles
const mobileSignUpBtn = document.getElementById('mobileSignUp');
const mobileSignInBtn = document.getElementById('mobileSignIn');

if (mobileSignUpBtn) {
    mobileSignUpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.add("right-panel-active");
    });
}

if (mobileSignInBtn) {
    mobileSignInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.remove("right-panel-active");
    });
}
