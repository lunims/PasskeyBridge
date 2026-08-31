(function () {
  if (document.getElementById("passkey-bridge-btn")) return;

  const btn = document.createElement("button");
  btn.id = "passkey-bridge-btn";
  btn.textContent = "🔑 Register Passkey";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483647",
    padding: "10px 16px",
    background: "#175ddc",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "system-ui, sans-serif",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  });

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "Waiting for authenticator…";

    chrome.runtime.sendMessage({ type: "REGISTER_PASSKEY" }, (response) => {
      if (response?.error) {
        console.error(
          `[Passkey Bridge] Registration failed for domain "${location.hostname}"`,
          response.error
        );
        btn.textContent = "❌ Failed — see console";
      } else {
        console.log(
          `[Passkey Bridge] Registered credential for domain "${location.hostname}"`,
          response.result
        );
        btn.textContent = "✅ Registered";
      }
      setTimeout(() => {
        btn.textContent = "🔑 Register Passkey";
        btn.disabled = false;
      }, 2500);
    });
  });

  document.documentElement.appendChild(btn);
})();