const form = document.querySelector("#login-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const response = await fetch("/login", {
        method: "POST",
        body: formData,
    });

    if (response.status === 401) {
        alert("Credenciais inválidas!");
        return;
    }

    if (response.ok) {
        window.location.href = "/home";
        return;
    }

    alert("Erro inesperado ao tentar fazer login.");
});

const inputPassword = document.querySelector("#password");
const openEye = document.querySelector("#open-eye");
const closedEye = document.querySelector("#closed-eye");

function togglePasswordVisibility() {
    const type = inputPassword.getAttribute("type") === "password" ? "text" : "password";
    inputPassword.setAttribute("type", type);

    if (inputPassword.getAttribute("type") === "text") {
        openEye.classList.add("unvisible");
        closedEye.classList.remove("unvisible");
    } else {
        openEye.classList.remove("unvisible");
        closedEye.classList.add("unvisible");
    }
}