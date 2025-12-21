(() => {
  const LOGIN_URL = "/login";

  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const remember = document.getElementById("remember");
  const statusEl = document.getElementById("status");
  const year = document.getElementById("year");
  const submitBtn = document.getElementById("submitBtn");
  year.textContent = new Date().getFullYear();

  let role = "employee";

  const roleBtns = document.querySelectorAll(".role-btn");
  roleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      roleBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      role = btn.dataset.role;
    });
  });

  const setStatus = (msg, type = "") => {
    statusEl.textContent = msg;
    statusEl.className = "status" + (type ? " " + type : "");
  };

  const postJSON = async (url, data, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? await res.json()
        : await res.text();
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setStatus("Signing in...");
    submitBtn.disabled = true;

    const username = email.value.trim();
    const pwd = password.value;

    if (!username || !pwd) {
      setStatus("Please enter your username and password.", "error");
      submitBtn.disabled = false;
      return;
    }

    try {
      const { ok, status, body } = await postJSON(LOGIN_URL, {
        username,
        password: pwd,
        user_type: role,
      });

      if (!ok) {
        const msg =
          (body && (body.message || body.error)) || `Login failed (${status})`;
        setStatus(msg, "error");
        submitBtn.disabled = false;
        return;
      }

      const payload = typeof body === "string" ? { raw: body } : body;

      setStatus("Login successful! Redirecting...", "ok");

      const authData = {
        role,
        token: payload.token,
        name: payload.name || "",
        message: payload.message,
      };

      if (remember.checked) {
        localStorage.setItem("vetlink_auth", JSON.stringify(authData));
      } else {
        sessionStorage.setItem("vetlink_auth", JSON.stringify(authData));
      }

      const next =
        payload.redirect || (role === "employee" ? "/dashboard" : "/home");
      setTimeout(() => (window.location.href = next), 800);
    } catch (err) {
      if (err.name === "AbortError") {
        setStatus("Request timed out. Check your connection.", "error");
      } else {
        setStatus("Network error. Please try again.", "error");
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
