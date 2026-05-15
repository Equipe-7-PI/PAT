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