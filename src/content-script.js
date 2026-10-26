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
    menu.setAttribute("role", "menu");
    Object.assign(menu.style, {
      position: "fixed",
      zIndex: "2147483647",
      boxSizing: "border-box",
      background: "#fff",
      color: "#222",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      overflow: "hidden",
      display: "none",
    });

    const header = document.createElement("div");
    header.textContent = "PasskeyBridge";
    Object.assign(header.style, {
      padding: "6px 14px",
      fontSize: "12px",
      color: "#666",
      background: "#f7f7f7",
      borderBottom: "1px solid #eee",
    });

    const registerItem = makeMenuItem("Register Passkey", () => {
      runAction(registerItem, "REGISTER_PASSKEY", "Registering passkey…", (response) => {
        console.log(`[Passkey Bridge] Register succeeded for "${location.hostname}"`, response.result);
      });
    });

    const deriveItem = makeMenuItem("Fill Password", () => {
      runAction(deriveItem, "DERIVE_HASH", "Deriving site-specific password…", (response) => {
        const result = fillDerivedPassword(response.result.password, false);
        console.log(`[Passkey Bridge] Fill result for "${location.hostname}"`, result);
      });
    });

    const items = [registerItem, deriveItem];
    menu.append(header, ...items);

    const isOpen = () => menu.style.display === "block";

    function place() {
      const r = passwordField.getBoundingClientRect();
      menu.style.left = `${r.left}px`;
      menu.style.minWidth = `${Math.max(r.width, 220)}px`;
      const below = r.bottom + 4;
      const fitsBelow = below + menu.offsetHeight <= window.innerHeight - 8;
      menu.style.top = fitsBelow ? `${below}px` : `${Math.max(8, r.top - menu.offsetHeight - 4)}px`;
    }

    function open() {
      if (!passwordField.isConnected) return;
      menu.style.display = "block"; // must be visible before measuring in place()
      place();
    }

    function close() {
      menu.style.display = "none";
    }

    // Clicking inside the menu must not take focus away from the password field
    menu.addEventListener("mousedown", (e) => e.preventDefault());

    // Open directly on focus / click (click re-opens after Escape)
    let suppressFocusOpen = false;
    passwordField.addEventListener("focus", () => {
      if (!suppressFocusOpen) open();
    });
    passwordField.addEventListener("click", open);

    passwordField.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen()) open();
        items[0].focus();
      }
    });

    // Close when focus leaves both the field and the menu
    passwordField.addEventListener("blur", (e) => {
      if (!menu.contains(e.relatedTarget)) close();
    });
    menu.addEventListener("focusout", (e) => {
      if (e.relatedTarget !== passwordField && !menu.contains(e.relatedTarget)) close();
    });

    // Keyboard navigation inside the menu
    menu.addEventListener("keydown", (e) => {
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === "Escape") {
        close();
        suppressFocusOpen = true;
        passwordField.focus();
        suppressFocusOpen = false;
      }
    });

    // Stay attached to the field while open
    const reposition = () => isOpen() && place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    document.documentElement.appendChild(menu);

    // Field already focused when we attach (autofocus)
    if (document.activeElement === passwordField) open();

    return { menu, field: passwordField };
  }

  function makeMenuItem(label, onClick) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    item.setAttribute("role", "menuitem");
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
    item.addEventListener("focus", () => (item.style.background = "#f0f0f0"));
    item.addEventListener("blur", () => (item.style.background = "none"));
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return item;
  }

  let attached = null;

  function scanAndAttach() {
    if (attached && attached.field.isConnected) return;

    if (attached) {
      attached.menu.remove();
      attached = null;
    }

    const passwordField = findPasswordField();
    if (!passwordField) return;

    attached = buildMenu(passwordField);
  }

  scanAndAttach();
  new MutationObserver(scanAndAttach).observe(document.body, { childList: true, subtree: true });
})();