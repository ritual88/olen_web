/* Отправка формы заявки. Вынесено в файл, чтобы работала строгая CSP. */
(function () {
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var status = form.querySelector('[data-form-status]');
  var submit = form.querySelector('button[type="submit"]');
  var nameInput = form.querySelector('#name');
  var contactInput = form.querySelector('#contact');
  var consent = form.querySelector('[name="consent"]');

  function show(text, kind) {
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
    status.className = 'form__status form__status--' + kind;

    if (kind === 'error' && form.dataset.telegram) {
      var link = document.createElement('a');
      link.href = form.dataset.telegram;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = ' Telegram';
      status.append(link);
    }
  }

  function setError(key, message) {
    var el = form.querySelector('[data-error-for="' + key + '"]');
    if (el) {
      el.hidden = !message;
      el.textContent = message;
    }
    var input = form.querySelector('#' + key);
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!nameInput || !contactInput) return;

    setError('name', '');
    setError('contact', '');

    var name = nameInput.value.trim();
    var contactValue = contactInput.value.trim();

    if (name.length < 2) {
      setError('name', 'Как к вам обращаться?');
      nameInput.focus();
      return;
    }

    if (contactValue.length < 3) {
      setError('contact', 'Оставьте Telegram или почту');
      contactInput.focus();
      return;
    }

    if (consent && !consent.checked) {
      show('Нужно согласие на обработку данных', 'error');
      consent.focus();
      return;
    }

    var typeEl = form.querySelector('#type');
    var messageEl = form.querySelector('#message');
    var honeypotEl = form.querySelector('#company');

    var payload = {
      name: name,
      contact: contactValue,
      type: typeEl ? typeEl.value : 'other',
      message: messageEl ? messageEl.value.trim() : '',
      company: honeypotEl ? honeypotEl.value : ''
    };

    if (submit) submit.disabled = true;
    show(form.dataset.msgSending || 'Отправляю…', 'ok');

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (json) {
          return { ok: res.ok, json: json };
        });
      })
      .then(function (result) {
        if (result.ok && result.json && result.json.ok) {
          form.reset();
          show(form.dataset.msgSuccess || 'Готово', 'ok');
          if (typeof window.ym === 'function') {
            window.ym(114347402, 'reachGoal', 'form_submit');
          }
          return;
        }
        if (result.json && result.json.errors) {
          Object.keys(result.json.errors).forEach(function (key) {
            setError(key, String(result.json.errors[key]));
          });
        }
        show(form.dataset.msgError || 'Не отправилось', 'error');
      })
      .catch(function () {
        show(form.dataset.msgError || 'Не отправилось', 'error');
      })
      .then(function () {
        if (submit) submit.disabled = false;
      });
  });
})();
