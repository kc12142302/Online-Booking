const bookingForm = document.querySelector("#booking-form");
const checkInInput = document.querySelector("#check-in");
const checkOutInput = document.querySelector("#check-out");
const formMessage = document.querySelector("#form-message");
const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextDateString(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
}

function updateDateLimits() {
  const today = getLocalDateString();
  checkInInput.min = today;

  const firstCheckoutDate = checkInInput.value
    ? getNextDateString(checkInInput.value)
    : getNextDateString(today);

  checkOutInput.min = firstCheckoutDate;
  if (checkOutInput.value && checkOutInput.value < firstCheckoutDate) {
    checkOutInput.value = "";
    if (checkOutInput.dataset.touched === "true") {
      showFieldError("check-out", "Choose a check-out date after check-in.");
    }
  }
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (!field || !error) return;
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", error.id);
  error.textContent = message;
}

function clearFieldError(field) {
  const error = document.getElementById(`${field.id}-error`);
  if (!error) return;
  field.removeAttribute("aria-invalid");
  field.removeAttribute("aria-describedby");
  error.textContent = "";
}

function validateField(field) {
  clearFieldError(field);
  const value = field.value.trim();
  let message = "";

  if (field.required && !value) {
    message = "This field is required.";
  } else if (field.type === "email" && value && !field.validity.valid) {
    message = "Enter a valid email address.";
  } else if (field.id === "check-in" && value && value < getLocalDateString()) {
    message = "Check-in cannot be in the past.";
  } else if (
    field.id === "check-out" &&
    value &&
    checkInInput.value &&
    value <= checkInInput.value
  ) {
    message = "Check-out must be at least one day after check-in.";
  }

  if (message) showFieldError(field.id, message);
  return !message;
}

function getRequiredFields() {
  return bookingForm.querySelectorAll("[required]");
}

updateDateLimits();

checkInInput.addEventListener("change", () => {
  clearFieldError(checkInInput);
  checkOutInput.dataset.touched = "true";
  updateDateLimits();
  if (checkOutInput.value) validateField(checkOutInput);
});

checkOutInput.addEventListener("change", () => {
  checkOutInput.dataset.touched = "true";
  validateField(checkOutInput);
});

getRequiredFields().forEach((field) => {
  if (field !== checkInInput && field !== checkOutInput) {
    field.addEventListener("blur", () => validateField(field));
  }
  field.addEventListener("input", () => {
    if (field.hasAttribute("aria-invalid")) validateField(field);
    formMessage.classList.remove("is-visible", "is-error");
  });
  field.addEventListener("change", () => {
    if (field.hasAttribute("aria-invalid")) validateField(field);
    formMessage.classList.remove("is-visible", "is-error");
  });
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.classList.remove("is-visible", "is-error");

  let isValid = true;
  getRequiredFields().forEach((field) => {
    if (!validateField(field)) isValid = false;
  });

  if (!isValid) {
    const firstInvalidField = bookingForm.querySelector('[aria-invalid="true"]');
    firstInvalidField?.focus();
    return;
  }

  const submitButton = bookingForm.querySelector('button[type="submit"]');
  if (bookingForm.action.includes("YOUR_FORM_ID")) {
    formMessage.textContent =
      "Formspree is not connected yet. Create a form and add its endpoint to the form action in index.html.";
    formMessage.classList.add("is-visible", "is-error");
    formMessage.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.innerHTML = "Sending request <span aria-hidden=\"true\">…</span>";

  try {
    const response = await fetch(bookingForm.action, {
      method: "POST",
      body: new FormData(bookingForm),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      let detail = "";
      try {
        const result = await response.json();
        detail = result.errors?.map((error) => error.message).join(" ") ?? "";
      } catch {
        detail = "";
      }
      throw new Error(detail || `Form service returned status ${response.status}.`);
    }

    const booking = Object.fromEntries(new FormData(bookingForm).entries());
    formMessage.textContent =
      `Thanks, ${booking.fullName}! Your request for ${booking.room}, ` +
      `${booking.checkIn} to ${booking.checkOut}, was submitted successfully.`;
    formMessage.classList.add("is-visible");
    formMessage.focus();
    bookingForm.reset();
    updateDateLimits();
  } catch (error) {
    console.error("Booking submission failed:", error);
    formMessage.textContent =
      error instanceof Error
        ? `We couldn't submit your request. ${error.message} Please try again.`
        : "We couldn't submit your request. Please try again.";
    formMessage.classList.add("is-visible", "is-error");
    formMessage.focus();
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "Check availability <span aria-hidden=\"true\">↗</span>";
  }
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  primaryNavigation.classList.toggle("is-open", !isOpen);
});

primaryNavigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    primaryNavigation.classList.remove("is-open");
  }
});
