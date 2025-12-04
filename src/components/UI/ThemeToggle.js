// File: src/components/UI/ThemeToggle.js
"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark"); // Default to match your current layout

  useEffect(() => {
    // 1. Check local storage
    const storedTheme = localStorage.getItem("s-elect-theme");
    
    // 2. Check the HTML attribute (fallback)
    const currentAttr = document.documentElement.getAttribute("data-bs-theme");

    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-bs-theme", storedTheme);
    } else if (currentAttr) {
      setTheme(currentAttr);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("s-elect-theme", newTheme);
    document.documentElement.setAttribute("data-bs-theme", newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="nav-link d-flex align-items-center w-100 text-body-secondary"
      style={{ background: "none", border: "none", textAlign: "left" }}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <i className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-stars-fill"} me-2 fs-5`}></i>
      <span className="fw-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}