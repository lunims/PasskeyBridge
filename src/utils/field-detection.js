/*
    Forked from Browserpass Project which is licendes under ICS Licensse:
    - https://github.com/browserpass/browserpass-extension/blob/master/src/inject.js
*/
(function () {

const FORM_MARKERS = ["login", "log-in", "log_in", "signin", "sign-in", "sign_in"];

const OPENID_FIELDS = {
  selectors: ["input[name*=openid i]", "input[id*=openid i]", "input[class*=openid i]"],
  types: ["text"],
};

const USERNAME_FIELDS = {
  selectors: [
    "input[autocomplete=username i]",

    "input[name=login i]",
    "input[name=user i]",
    "input[name=username i]",
    "input[name=email i]",
    "input[name=alias i]",
    "input[id=login i]",
    "input[id=user i]",
    "input[id=username i]",
    "input[id=email i]",
    "input[id=alias i]",
    "input[class=login i]",
    "input[class=user i]",
    "input[class=username i]",
    "input[class=email i]",
    "input[class=alias i]",
    "input[aria-label=login i]",
    "input[aria-label=user i]",
    "input[aria-label=username i]",
    "input[aria-label=email i]",
    "input[aria-label=alias i]",

    "input[name*=login i]",
    "input[name*=user i]",
    "input[name*=email i]",
    "input[name*=alias i]",
    "input[id*=login i]",
    "input[id*=user i]",
    "input[id*=email i]",
    "input[id*=alias i]",
    "input[class*=login i]",
    "input[class*=user i]",
    "input[class*=email i]",
    "input[class*=alias i]",

    "input[type=email i]",
    "input[autocomplete=email i]",
    "input[type=text i]",
    "input[type=tel i]",
  ],
  types: ["email", "text", "tel"],
};

const PASSWORD_FIELDS = {
  selectors: [
    "input[type=password i][autocomplete=current-password i]",
    "input[type=password i]",
  ],
};

const INPUT_FIELDS = {
  selectors: PASSWORD_FIELDS.selectors
    .concat(USERNAME_FIELDS.selectors)
    .concat(OPENID_FIELDS.selectors),
};

const SUBMIT_FIELDS = {
  selectors: [
    "[type=submit i]",

    "button[name=login i]",
    "button[name=log-in i]",
    "button[name=log_in i]",
    "button[name=signin i]",
    "button[name=sign-in i]",
    "button[name=sign_in i]",
    "button[id=login i]",
    "button[id=log-in i]",
    "button[id=log_in i]",
    "button[id=signin i]",
    "button[id=sign-in i]",
    "button[id=sign_in i]",
    "button[class=login i]",
    "button[class=log-in i]",
    "button[class=log_in i]",
    "button[class=signin i]",
    "button[class=sign-in i]",
    "button[class=sign_in i]",
    "input[type=button i][name=login i]",
    "input[type=button i][name=log-in i]",
    "input[type=button i][name=log_in i]",
    "input[type=button i][name=signin i]",
    "input[type=button i][name=sign-in i]",
    "input[type=button i][name=sign_in i]",
    "input[type=button i][id=login i]",
    "input[type=button i][id=log-in i]",
    "input[type=button i][id=log_in i]",
    "input[type=button i][id=signin i]",
    "input[type=button i][id=sign-in i]",
    "input[type=button i][id=sign_in i]",
    "input[type=button i][class=login i]",
    "input[type=button i][class=log-in i]",
    "input[type=button i][class=log_in i]",
    "input[type=button i][class=signin i]",
    "input[type=button i][class=sign-in i]",
    "input[type=button i][class=sign_in i]",

    "button[name*=login i]",
    "button[name*=log-in i]",
    "button[name*=log_in i]",
    "button[name*=signin i]",
    "button[name*=sign-in i]",
    "button[name*=sign_in i]",
    "button[id*=login i]",
    "button[id*=log-in i]",
    "button[id*=log_in i]",
    "button[id*=signin i]",
    "button[id*=sign-in i]",
    "button[id*=sign_in i]",
    "button[class*=login i]",
    "button[class*=log-in i]",
    "button[class*=log_in i]",
    "button[class*=signin i]",
    "button[class*=sign-in i]",
    "button[class*=sign_in i]",
    "input[type=button i][name*=login i]",
    "input[type=button i][name*=log-in i]",
    "input[type=button i][name*=log_in i]",
    "input[type=button i][name*=signin i]",
    "input[type=button i][name*=sign-in i]",
    "input[type=button i][name*=sign_in i]",
    "input[type=button i][id*=login i]",
    "input[type=button i][id*=log-in i]",
    "input[type=button i][id*=log_in i]",
    "input[type=button i][id*=signin i]",
    "input[type=button i][id*=sign-in i]",
    "input[type=button i][id*=sign_in i]",
    "input[type=button i][class*=login i]",
    "input[type=button i][class*=log-in i]",
    "input[type=button i][class*=log_in i]",
    "input[type=button i][class*=signin i]",
    "input[type=button i][class*=sign-in i]",
    "input[type=button i][class*=sign_in i]",
  ],
};

const OPACITY_LIMIT = 0.1;

/**
 * Fill password
 *
 * @param {object} request Form fill request
 * @return {object} result of filling a form
 */
function fillLogin(request) {
  var result = {
    filledFields: [],
    foreignFill: undefined,
  };

  let loginForm = undefined;
  if (request.fields.includes("openid")) {
    loginForm = form(OPENID_FIELDS);
  } else {
    loginForm = form(INPUT_FIELDS);
  }

  if (!request.allowNoSecret && !find(PASSWORD_FIELDS, loginForm)) {
    return result;
  }

  if (window.location.origin !== request.origin) {
    if (!request.allowForeign || request.foreignFills[window.location.origin] === false) {
      return result;
    }
    var message =
      "You have requested to fill login credentials into an embedded document from a " +
      "different origin than the main document in this tab. Do you wish to proceed?\n\n" +
      `Tab origin: ${request.origin}\n` +
      `Embedded origin: ${window.location.origin}`;
    if (request.foreignFills[window.location.origin] !== true) {
      result.foreignOrigin = window.location.origin;
      result.foreignFill = confirm(message);
      if (!result.foreignFill) {
        return result;
      }
    }
  }

  if (
    request.fields.includes("login") &&
    update(USERNAME_FIELDS, request.login.fields.login, loginForm)
  ) {
    result.filledFields.push("login");
  }

  if (
    request.fields.includes("secret") &&
    update(PASSWORD_FIELDS, request.login.fields.secret, loginForm)
  ) {
    result.filledFields.push("secret");
  }

  if (
    request.fields.includes("openid") &&
    update(OPENID_FIELDS, request.login.fields.openid, loginForm)
  ) {
    result.filledFields.push("openid");
  }

  return result;
}

/**
 * Focus submit button, and maybe click on it (based on user settings)
 *
 * @param {object} request Form fill request
 * @return {object} result of focusing or submitting a form
 */
function focusOrSubmit(request) {
  var result = {};

  let loginForm = undefined;
  if (request.filledFields.includes("openid")) {
    loginForm = form(OPENID_FIELDS);
  } else {
    loginForm = form(INPUT_FIELDS);
  }

  if (window.location.origin !== request.origin) {
    if (!request.allowForeign || request.foreignFills[window.location.origin] === false) {
      return;
    }
  }

  var password_inputs = queryAllVisible(document, PASSWORD_FIELDS, loginForm);
  if (password_inputs.length > 1) {
    password_inputs[1].select();
  } else {
    var submit = find(SUBMIT_FIELDS, loginForm);

    if (submit) {
      if (request.autoSubmit) {
        submit.click();
      } else {
        submit.focus();
      }
    } else {
      for (let selectors of [OPENID_FIELDS, PASSWORD_FIELDS, USERNAME_FIELDS]) {
        let field = find(selectors, loginForm);
        if (field) {
          field.focus();
          break;
        }
      }
    }
  }

  return result;
}

function queryShadowRoots(parent, selector) {
  return [...parent.querySelectorAll(selector)]
    .filter((e) => e.shadowRoot)
    .flatMap((e) => [e.shadowRoot, ...queryShadowRoots(e.shadowRoot, selector)]);
}

function queryAllVisible(parent, field, form) {
  const result = [];
  const shadowRootSelector =
    document.documentElement.getAttribute("browserpass-detected-shadow-roots") !== null
      ? "[browserpass-detected-shadow-root]"
      : "*";
  const shadowRoots = queryShadowRoots(parent, shadowRootSelector);
  for (let root of [parent, ...shadowRoots]) {
    for (let i = 0; i < field.selectors.length; i++) {
      let elems = root.querySelectorAll(field.selectors[i]);
      for (let j = 0; j < elems.length; j++) {
        let elem = elems[j];
        if (form && form != elem.form) {
          continue;
        }
        if (elem.disabled) {
          continue;
        }
        if (elem.offsetWidth < 30 || elem.offsetHeight < 10) {
          continue;
        }
        if (field.types && field.types.indexOf(elem.type.toLowerCase()) < 0) {
          continue;
        }
        let style = window.getComputedStyle(elem);
        if (style.visibility == "hidden") {
          continue;
        }
        let rect = elem.getBoundingClientRect();
        if (
          rect.x + rect.width < 0 ||
          rect.y + rect.height < 0 ||
          rect.x > window.innerWidth ||
          rect.y > window.innerHeight
        ) {
          continue;
        }
        let opacity = 1;
        for (
          let testElem = elem;
          opacity >= OPACITY_LIMIT &&
          testElem &&
          testElem.nodeType === Node.ELEMENT_NODE;
          testElem = testElem.parentNode
        ) {
          let testStyle = window.getComputedStyle(testElem);
          if (testStyle.opacity) {
            opacity *= parseFloat(testStyle.opacity);
          }
        }
        if (opacity < OPACITY_LIMIT) {
          continue;
        }
        result.push(elem);
      }
    }
  }
  return result;
}

function queryFirstVisible(parent, field, form) {
  var elems = queryAllVisible(parent, field, form);
  return elems.length > 0 ? elems[0] : undefined;
}

function form(selectors) {
  const elems = queryAllVisible(document, selectors, undefined);
  const forms = [];
  for (let elem of elems) {
    const form = elem.form;
    if (form && forms.indexOf(form) < 0) {
      forms.push(form);
    }
  }

  const markedForms = [];
  for (let form of forms) {
    const props = ["id", "name", "class", "action"];
    for (let marker of FORM_MARKERS) {
      for (let prop of props) {
        let propValue = form.getAttribute(prop) || "";
        if (propValue.toLowerCase().indexOf(marker) > -1) {
          markedForms.push(form);
        }
      }
    }
  }

  const formsWithPassword = [];
  for (let form of markedForms) {
    if (find(PASSWORD_FIELDS, form)) {
      formsWithPassword.push(form);
    }
  }

  if (formsWithPassword.length > 0) {
    return formsWithPassword[0];
  }
  if (markedForms.length > 0) {
    return markedForms[0];
  }
  if (forms.length > 0) {
    return forms[0];
  }
  return undefined;
}

function find(field, form) {
  return queryFirstVisible(document, field, form);
}

function update(field, value, form) {
  if (value === undefined) {
    return true;
  }

  if (!value.length) {
    return false;
  }

  let el = find(field, form);
  if (!el) {
    return false;
  }
  for (let eventName of ["click", "focus"]) {
    el.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  el = find(field, form);
  if (!el) {
    return false;
  }

  for (let eventName of ["click", "focus"]) {
    el.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  for (let eventName of ["keydown", "keypress", "keyup", "input", "change"]) {
    el.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  if (el.maxLength > 0) {
    value = value.substr(0, el.maxLength);
  }

  let initialValue = el.value || el.getAttribute("value");
  el.setAttribute("value", value);
  el.value = value;

  for (let eventName of ["keydown", "keypress", "keyup", "input", "change"]) {
    el.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  if ((el.value || el.getAttribute("value")) === initialValue) {
    el.setAttribute("value", value);
    el.value = value;
  }

  el.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

/**
 * Finds the detected login form's password field, for UI purposes such
 * as anchoring a button near it. This is a custom method, which is not part of the Browserpass project
 *
 * @returns {Element|undefined}
 */
function findPasswordField() {
  const loginForm = form(INPUT_FIELDS);
  return find(PASSWORD_FIELDS, loginForm);
}

window.PasskeyBridgeFieldDetection = { fillLogin, focusOrSubmit, findPasswordField };

})();