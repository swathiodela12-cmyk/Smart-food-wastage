function showTab(tab) {
  const loginCard = document.getElementById("login-card");
  const registerCard = document.getElementById("register-card");
  const links = document.querySelectorAll(".tab-link");

  if (tab === "register") {
    loginCard.style.display = "none";
    registerCard.style.display = "block";
  } else {
    loginCard.style.display = "block";
    registerCard.style.display = "none";
    tab = "login";
  }

  links.forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === tab);
  });
}

document.querySelectorAll(".tab-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    window.location.hash = tab;
    showTab(tab);
  });
});

window.addEventListener("hashchange", () => {
  showTab(window.location.hash.replace("#", ""));
});

// initial state based on URL hash
showTab(window.location.hash.replace("#", "") || "login");
