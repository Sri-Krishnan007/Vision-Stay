// ================= ELEMENT REFERENCES =================
const adminBtn = document.getElementById("adminBtn");
const studentBtn = document.getElementById("studentBtn");

const adminForm = document.getElementById("adminForm");
const studentForm = document.getElementById("studentForm");

// ================= ROLE SWITCH HANDLING =================
adminBtn.addEventListener("click", () => {
    adminBtn.classList.add("active");
    studentBtn.classList.remove("active");

    adminForm.classList.remove("hidden");
    studentForm.classList.add("hidden");
});

studentBtn.addEventListener("click", () => {
    studentBtn.classList.add("active");
    adminBtn.classList.remove("active");

    studentForm.classList.remove("hidden");
    adminForm.classList.add("hidden");
});

// ================= SIMPLE UX EFFECT =================
document.addEventListener("DOMContentLoaded", () => {
    console.log("VisionStay Login Page Loaded");
});
