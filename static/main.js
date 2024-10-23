// Toggle between login and register forms
var loginForm = document.getElementById("login");
var registerForm = document.getElementById("register");
var btn = document.getElementById("btn");

function registered() {
  loginForm.style.left = "-400px"; // Slide the login form out
  registerForm.style.left = "50px"; // Slide the register form in
  btn.style.left = "110px"; // Move the toggle button
}

function logined() {
  loginForm.style.left = "50px"; // Slide the login form in
  registerForm.style.left = "450px"; // Slide the register form out
  btn.style.left = "0"; // Move the toggle button
}

// Function for logging in
async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username, password: password }),
    });

    const data = await response.json();
    if (data.status === "success") {
      // Store the user age in session storage if provided
      sessionStorage.setItem("userAge", data.age);
      // Redirect to the dashboard using the URL returned from the server
      window.location.href = data.redirect;
    } else {
      alert("Login failed: " + data.message);
    }
  } catch (error) {
    alert("An error occurred: " + error.message);
  }
}

// Function for registering a new account
// Function for registering a new account
function selectGender(gender) {
  const maleButton = document.querySelector(".gender-male");
  const femaleButton = document.querySelector(".gender-female");
  const genderInput = document.getElementById("selected-gender");

  if (gender === "male") {
    if (!maleButton.classList.contains("selected")) {
      maleButton.classList.add("selected");
      femaleButton.classList.remove("selected");
      maleButton.querySelector("i").style.color = "#68d0e8";
      femaleButton.querySelector("i").style.color = "#ccc";
    }
    genderInput.value = "male"; // Set the hidden input value to male
  } else if (gender === "female") {
    if (!femaleButton.classList.contains("selected")) {
      femaleButton.classList.add("selected");
      maleButton.classList.remove("selected");
      femaleButton.querySelector("i").style.color = "#e4196a";
      maleButton.querySelector("i").style.color = "#ccc";
    }
    genderInput.value = "female"; // Set the hidden input value to female
  }
}

// Function for registering a new account
async function register() {
  const username = document.getElementById("register-username").value;
  const dob = document.getElementById("register-dob").value;
  const password = document.getElementById("register-password").value;
  const gender = document.getElementById("selected-gender").value; // Get the selected gender

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        dob: dob,
        password: password,
        gender: gender, // Send gender to the server
      }),
    });

    const data = await response.json();
    if (data.status === "success") {
      alert("Account created successfully!");
      logined();
    } else {
      alert("Registration failed: " + data.message);
    }
  } catch (error) {
    alert("An error occurred: " + error.message);
  }
}
