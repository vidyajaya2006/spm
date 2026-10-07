/* =========================================================
   PET — AUTHENTICATION
   Login + Registration
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       COMMON HELPERS
       ===================================================== */

    function showMessage(message, type = "error") {
        const messageBox = document.getElementById("authMessage");

        if (!messageBox) return;

        messageBox.textContent = message;
        messageBox.className = `auth-message ${type}`;
    }

    function hideMessage() {
        const messageBox = document.getElementById("authMessage");

        if (!messageBox) return;

        messageBox.className = "auth-message";
        messageBox.textContent = "";
    }

    function setLoading(button, loadingText) {
        if (!button) return;

        button.disabled = true;

        button.dataset.originalText = button.innerHTML;

        button.innerHTML = `
            <span class="loading">
                <span class="spinner"></span>
                ${loadingText}
            </span>
        `;
    }

    function removeLoading(button) {
        if (!button) return;

        button.disabled = false;

        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }


    /* =====================================================
       PASSWORD VISIBILITY
       ===================================================== */

    const passwordToggles =
        document.querySelectorAll(".password-toggle");

    passwordToggles.forEach(toggle => {

        toggle.addEventListener("click", () => {

            const targetId =
                toggle.getAttribute("data-target");

            const passwordInput =
                document.getElementById(targetId);

            if (!passwordInput) return;

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                toggle.textContent = "🙈";

            } else {

                passwordInput.type = "password";

                toggle.textContent = "👁";
            }
        });
    });


    /* =====================================================
       PASSWORD STRENGTH
       ===================================================== */

    const passwordInput =
        document.getElementById("password");

    const strengthFill =
        document.querySelector(".strength-fill");

    const strengthText =
        document.querySelector(".strength-text");

    if (passwordInput && strengthFill && strengthText) {

        passwordInput.addEventListener("input", () => {

            const password = passwordInput.value;

            let strength = 0;

            if (password.length >= 8) {
                strength++;
            }

            if (/[A-Z]/.test(password)) {
                strength++;
            }

            if (/[a-z]/.test(password)) {
                strength++;
            }

            if (/[0-9]/.test(password)) {
                strength++;
            }

            if (/[^A-Za-z0-9]/.test(password)) {
                strength++;
            }


            if (password.length === 0) {

                strengthFill.style.width = "0%";
                strengthText.textContent = "";

            } else if (strength <= 2) {

                strengthFill.style.width = "35%";
                strengthFill.style.background =
                    "#ef4444";

                strengthText.textContent =
                    "Weak password";

            } else if (strength <= 4) {

                strengthFill.style.width = "70%";
                strengthFill.style.background =
                    "#f59e0b";

                strengthText.textContent =
                    "Medium password";

            } else {

                strengthFill.style.width = "100%";
                strengthFill.style.background =
                    "#16a34a";

                strengthText.textContent =
                    "Strong password";
            }
        });
    }


    /* =====================================================
       REGISTRATION
       ===================================================== */

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            hideMessage();

            const name =
                document.getElementById("name")?.value.trim();

            const email =
                document.getElementById("email")?.value.trim();

            const password =
                document.getElementById("password")?.value;

            const confirmPassword =
                document.getElementById("confirmPassword")?.value;

            const terms =
                document.getElementById("terms");


            /* ---------------------------------------------
               VALIDATION
               --------------------------------------------- */

            if (!name) {

                showMessage(
                    "Please enter your full name."
                );

                return;
            }


            if (!email) {

                showMessage(
                    "Please enter your email address."
                );

                return;
            }


            if (!email.includes("@")) {

                showMessage(
                    "Please enter a valid email address."
                );

                return;
            }


            if (!password) {

                showMessage(
                    "Please create a password."
                );

                return;
            }


            if (password.length < 8) {

                showMessage(
                    "Password must contain at least 8 characters."
                );

                return;
            }


            if (password !== confirmPassword) {

                showMessage(
                    "Passwords do not match."
                );

                return;
            }


            if (terms && !terms.checked) {

                showMessage(
                    "Please accept the Terms and Privacy Policy."
                );

                return;
            }


            const registerButton =
                document.getElementById("registerButton");

            setLoading(
                registerButton,
                "Creating account..."
            );


            /* ---------------------------------------------
               SEND TO FLASK
               --------------------------------------------- */

            try {

                const response =
                    await fetch("/api/auth/register", {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            name: name,
                            email: email,
                            password: password
                        })
                    });


                const data =
                    await response.json();


                if (!response.ok) {

                    showMessage(
                        data.message ||
                        data.error ||
                        "Registration failed."
                    );

                    removeLoading(registerButton);

                    return;
                }


                /* -----------------------------------------
                   SUCCESS
                   ----------------------------------------- */

                showMessage(
                    "Account created successfully! Redirecting...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "/login.html";

                }, 1200);


            } catch (error) {

                console.error(error);

                showMessage(
                    "Unable to connect to PET server. Please make sure Flask is running."
                );

                removeLoading(registerButton);
            }

        });
    }


    /* =====================================================
       LOGIN
       ===================================================== */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            hideMessage();


            const email =
                document.getElementById("email")?.value.trim();

            const password =
                document.getElementById("password")?.value;

            const remember =
                document.getElementById("remember")?.checked || false;


            /* ---------------------------------------------
               VALIDATION
               --------------------------------------------- */

            if (!email) {

                showMessage(
                    "Please enter your email address."
                );

                return;
            }


            if (!password) {

                showMessage(
                    "Please enter your password."
                );

                return;
            }


            const loginButton =
                document.getElementById("loginButton");

            setLoading(
                loginButton,
                "Signing in..."
            );


            /* ---------------------------------------------
               SEND TO FLASK
               --------------------------------------------- */

            try {

                const response =
                    await fetch("/api/auth/login", {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password,
                            remember: remember
                        })
                    });


                const data =
                    await response.json();


                if (!response.ok) {

                    showMessage(
                        data.message ||
                        data.error ||
                        "Invalid email or password."
                    );

                    removeLoading(loginButton);

                    return;
                }


                /* -----------------------------------------
                   LOGIN SUCCESS
                   ----------------------------------------- */

                showMessage(
                    "Login successful! Opening your dashboard...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "/index.html";

                }, 700);


            } catch (error) {

                console.error(error);

                showMessage(
                    "Unable to connect to PET server. Please make sure Flask is running."
                );

                removeLoading(loginButton);
            }

        });
    }


    /* =====================================================
       CHECK CURRENT USER
       ===================================================== */

    window.checkPETSession = async function () {

        try {

            const response =
                await fetch("/api/auth/me");

            if (!response.ok) {

                return null;
            }

            const data =
                await response.json();

            return data;

        } catch (error) {

            console.error(
                "Session check failed:",
                error
            );

            return null;
        }
    };


    /* =====================================================
       LOGOUT
       ===================================================== */

    window.logoutPET = async function () {

        try {

            const response =
                await fetch("/api/auth/logout", {
                    method: "POST"
                });

            if (response.ok) {

                window.location.href =
                    "/login.html";
            }

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );
        }
    };

});