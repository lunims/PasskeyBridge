(function () {
  if (document.getElementById("passkey-bridge-btn")) return;

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483647",
    display: "flex",
    gap: "8px",
    fontFamily: "system-ui, sans-serif",
  });

  const registerBtn = makeButton("register-btn", "🔑 Register Passkey", "#175ddc");
  const deriveBtn = makeButton("derive-btn", "#️⃣ Derive Hash", "#0e9f6e");

  container.appendChild(registerBtn);
  container.appendChild(deriveBtn);
  document.documentElement.appendChild(container);

  registerBtn.addEventListener("click", () =>
    runAction(registerBtn, "REGISTER_PASSKEY", "Waiting for authenticator…")
  );
  deriveBtn.addEventListener("click", () =>
    runAction(deriveBtn, "DERIVE_HASH", "Deriving hash…")
  );

  function runAction(btn, type, waitingMsg) {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = waitingMsg;

    chrome.runtime.sendMessage({ type }, (response) => {
      if (response?.error) {
        console.error(`[Passkey Bridge] ${type} failed for "${location.hostname}"`, response.error);
        btn.textContent = "❌ Failed — see console";
      } else {
        console.log(`[Passkey Bridge] ${type} succeeded for "${location.hostname}"`, response.result);
        btn.textContent = "✅ Done";
      }
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2500);
    });
  }

  function makeButton(id, label, color) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: "10px 16px",
      background: color,
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    });
    return btn;
  }
})();