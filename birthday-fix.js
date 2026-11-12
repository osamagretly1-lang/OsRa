/* OsRa — Birthday-only compatibility fix R3. Keeps the existing app logic intact. */
(function () {
  'use strict';

  if (window.__osraBirthdayOnlyFixInstalled) return;
  window.__osraBirthdayOnlyFixInstalled = true;

  const FIXED_BIRTHDAY = '1996-10-07';
  const DOG_INDEX_KEY = 'OsRa_BirthdayDog_Next_v1';
  let fallbackDogIndex = 0;

  function forceBirthdayDate() {
    try {
      if (typeof DEFAULT !== 'undefined' && DEFAULT.settings) {
        DEFAULT.settings.birthdayRania = FIXED_BIRTHDAY;
      }
      if (typeof state !== 'undefined' && state && state.settings) {
        state.settings.birthdayRania = FIXED_BIRTHDAY;
      }
    } catch (error) {
      console.warn('OsRa birthday date fix could not update state', error);
    }
  }

  function isBirthdayCelebrationDay() {
    try {
      const birthday = String(
        (typeof state !== 'undefined' && state?.settings?.birthdayRania) || FIXED_BIRTHDAY
      );
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return false;
      const month = birthday.slice(5, 7);
      const day = birthday.slice(8, 10);
      const dayBefore = new Date(2000, Number(month) - 1, Number(day) - 1);
      const previousKey = `${String(dayBefore.getMonth() + 1).padStart(2, '0')}-${String(dayBefore.getDate()).padStart(2, '0')}`;
      const currentKey = typeof today === 'function' ? String(today()).slice(5) : '';
      return currentKey === previousKey || currentKey === `${month}-${day}`;
    } catch {
      return false;
    }
  }

  // The original normalizer maps 7 October back to 15 October. Correct it after
  // every normalization so settings saves/restores cannot reintroduce the bug.
  if (typeof normalizeState === 'function') {
    const originalNormalizeState = normalizeState;
    normalizeState = function (...args) {
      const result = originalNormalizeState.apply(this, args);
      forceBirthdayDate();
      return result;
    };
  }

  // The original load() contains a second 7→15 migration. Re-save the corrected
  // value after the original loader has completed all its other work.
  if (typeof load === 'function') {
    const originalLoad = load;
    load = async function (...args) {
      const result = await originalLoad.apply(this, args);
      forceBirthdayDate();
      if (typeof put === 'function' && typeof state !== 'undefined') {
        await put('state', { key: 'main', value: state });
      }
      return result;
    };
  }

  // Expose the home-page greeting button on both 6 and 7 October.
  if (typeof annual === 'function') {
    const originalAnnual = annual;
    annual = function (value, ...args) {
      const result = originalAnnual.call(this, value, ...args);
      if (result && String(value || '').slice(5) === '10-07' && isBirthdayCelebrationDay()) {
        return { ...result, days: 0 };
      }
      return result;
    };
  }

  // Keep automatic celebration effects tied to the global toggle, but define
  // the birthday window as 6–7 October rather than 7 October alone.
  if (typeof isBirthdayRaniaToday === 'function') {
    isBirthdayRaniaToday = isBirthdayCelebrationDay;
  }
  if (typeof birthdayUiIsActive === 'function') {
    birthdayUiIsActive = function () {
      return isBirthdayCelebrationDay() &&
        (typeof surprisesAreEnabled !== 'function' || surprisesAreEnabled()) &&
        !document.querySelector('#lightbox')?.open;
    };
  }

  function ensureThreeDogs() {
    const dialog = document.querySelector('#birthday-dog-dialog');
    const wrap = dialog?.querySelector('.birthday-dog-wrap');
    const originalDog = wrap?.querySelector('.birthday-dog-svg');
    if (!dialog || !wrap || !originalDog) return null;

    originalDog.dataset.birthdayDog = 'original';
    wrap.style.position = 'relative';

    const definitions = [
      { key: 'german', src: 'assets/mascots/dog.png', alt: 'كلب جيرمن كرتوني' },
      { key: 'white', src: 'assets/mascots/white-dog.png', alt: 'كلب أبيض كرتوني' }
    ];

    for (const definition of definitions) {
      let image = wrap.querySelector(`[data-osra-birthday-dog="${definition.key}"]`);
      if (!image) {
        image = document.createElement('img');
        image.dataset.osraBirthdayDog = definition.key;
        image.alt = definition.alt;
        image.decoding = 'async';
        image.loading = 'eager';
        image.src = new URL(definition.src, document.baseURI).href;
        image.style.cssText = [
          'display:none', 'width:auto', 'max-width:100%', 'height:330px',
          'max-height:100%', 'object-fit:contain', 'object-position:center',
          'margin:auto', 'filter:drop-shadow(0 8px 8px rgba(42,20,34,.18))'
        ].join(';');
        image.addEventListener('error', () => {
          image.dataset.osraDogUnavailable = '1';
          image.style.display = 'none';
          originalDog.hidden = false;
          originalDog.style.display = 'block';
        }, { once: true });
        wrap.appendChild(image);
      }
    }

    let sign = wrap.querySelector('[data-osra-birthday-dog-sign]');
    if (!sign) {
      sign = document.createElement('div');
      sign.dataset.osraBirthdayDogSign = '1';
      sign.textContent = 'كل سنة وانتي طيبة يا رانيا ❤️🎂';
      sign.style.cssText = [
        'display:none', 'position:absolute', 'bottom:3px', 'left:50%',
        'transform:translateX(-50%)', 'width:max-content', 'max-width:95%',
        'padding:7px 12px', 'border:1px solid #f2bf27', 'border-radius:12px',
        'background:#fff7b8', 'color:#9b2424', 'font-weight:800',
        'font-size:clamp(12px,3vw,15px)', 'text-align:center', 'box-shadow:0 3px 12px #0002'
      ].join(';');
      wrap.appendChild(sign);
    }

    return { dialog, wrap, originalDog, sign };
  }

  function showNextDog() {
    const parts = ensureThreeDogs();
    if (!parts) return;
    const { wrap, originalDog, sign } = parts;
    const german = wrap.querySelector('[data-osra-birthday-dog="german"]');
    const white = wrap.querySelector('[data-osra-birthday-dog="white"]');
    const dogs = [originalDog, german, white].filter(node => node && node.dataset.osraDogUnavailable !== '1');

    let index = fallbackDogIndex;
    try {
      const stored = Number(localStorage.getItem(DOG_INDEX_KEY));
      if (Number.isInteger(stored) && stored >= 0) index = stored;
    } catch { /* Continue with the in-memory counter when storage is unavailable. */ }
    index %= dogs.length;
    dogs.forEach((dog, i) => {
      const visible = i === index;
      dog.hidden = !visible;
      dog.style.display = visible ? 'block' : 'none';
    });
    sign.hidden = index === 0;
    sign.style.display = index === 0 ? 'none' : 'block';

    const next = (index + 1) % dogs.length;
    fallbackDogIndex = next;
    try { localStorage.setItem(DOG_INDEX_KEY, String(next)); } catch { /* Optional persistence. */ }
  }

  // A manual tap on the birthday button must open the greeting even when the
  // general surprises/celebrations switch is off.
  if (typeof birthdayRaniaGreeting === 'function') {
    birthdayRaniaGreeting = function () {
      const dialog = document.querySelector('#birthday-dog-dialog');
      if (!dialog) return;
      if (!dialog.open) {
        showNextDog();
        dialog.showModal();
      }
    };
  }

  forceBirthdayDate();
  console.info('OsRa birthday-only fix enabled: 7 October; celebration 6–7 October; three rotating dogs; R3 compatibility package.');
})();
