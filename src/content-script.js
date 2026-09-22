(function () {
  const { fillLogin, focusOrSubmit, findPasswordField } = window.PasskeyBridgeFieldDetection;

  function fillDerivedPassword(password, autoSubmit = false) {
    const request = {
      origin: window.location.origin,
      fields: ["secret"],
      allowNoSecret: false,
      allowForeign: false,
      foreignFills: {},
      autoSubmit,
      login: {
        fields: {
          secret: password,
        },
      },
    };

    const fillResult = fillLogin(request);

    if (fillResult.filledFields.length > 0) {
      focusOrSubmit({ ...request, filledFields: fillResult.filledFields });
    }

    return fillResult;
  }

  function runAction(item, type, waitingMsg, onSuccess) {
    const originalText = item.textContent;
    item.textContent = waitingMsg;
    item.style.pointerEvents = "none";

    chrome.runtime.sendMessage({ type }, (response) => {
      if (!response || response.error) {
        console.error(
          `[Passkey Bridge] ${type} failed for "${location.hostname}"`,
          response?.error ?? "no response received"
        );
        item.textContent = "❌ Failed — see console";
      } else {
        onSuccess(response);
        item.textContent = "✅ Done";
      }
      setTimeout(() => {
        item.textContent = originalText;
        item.style.pointerEvents = "";
      }, 2500);
    });
  }

  function buildMenu(passwordField) {
    const menu = document.createElement("div");
    menu.id = "passkey-bridge-menu";
    Object.assign(menu.style, {
      position: "fixed",
      zIndex: "2147483647",
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      overflow: "hidden",
      display: "none",
    });

    const toggle = document.createElement("button");
    toggle.id = "passkey-bridge-toggle";
    toggle.textContent = "🔑";
    Object.assign(toggle.style, {
      position: "fixed",
      zIndex: "2147483647",
      width: "28px",
      height: "28px",
      border: "none",
      borderRadius: "6px",
      background: "#175ddc",
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
    });

    const registerItem = makeMenuItem("Register Passkey", () => {
      runAction(registerItem, "REGISTER_PASSKEY", "Registering…", (response) => {
        console.log(`[Passkey Bridge] Register succeeded for "${location.hostname}"`, response.result);
      });
    });

    const deriveItem = makeMenuItem("Fill Password", () => {
      runAction(deriveItem, "DERIVE_HASH", "Deriving…", (response) => {
        const result = fillDerivedPassword(response.result.password, /* autoSubmit */ false);
        console.log(`[Passkey Bridge] Fill result for "${location.hostname}"`, result);
      });
    });

    menu.appendChild(registerItem);
    menu.appendChild(deriveItem);

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === "block";
      menu.style.display = isOpen ? "none" : "block";
    });

    document.addEventListener("click", () => {
      menu.style.display = "none";
    });

    positionNear(toggle, passwordField, 0);
    positionNear(menu, passwordField, 32);

    document.documentElement.appendChild(toggle);
    document.documentElement.appendChild(menu);
  }

  function makeMenuItem(label, onClick) {
    const item = document.createElement("button");
    item.textContent = label;
    Object.assign(item.style, {
      display: "block",
      width: "100%",
      padding: "8px 14px",
      border: "none",
      background: "none",
      textAlign: "left",
      cursor: "pointer",
      whiteSpace: "nowrap",
    });
    item.addEventListener("mouseenter", () => (item.style.background = "#f0f0f0"));
    item.addEventListener("mouseleave", () => (item.style.background = "none"));
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return item;
  }

  function positionNear(el, field, verticalOffset) {
    const rect = field.getBoundingClientRect();
    Object.assign(el.style, {
      top: `${rect.top + verticalOffset}px`,
      left: `${rect.right + 8}px`,
    });
  }

  function scanAndAttach() {
    if (document.getElementById("passkey-bridge-toggle")) return;

    const passwordField = findPasswordField();
    if (!passwordField) return;

    buildMenu(passwordField);
  }

  scanAndAttach();
  new MutationObserver(scanAndAttach).observe(document.body, { childList: true, subtree: true });
})();