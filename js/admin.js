(function () {
  const fab = document.getElementById('admin-fab');
  const panel = document.getElementById('admin-panel');
  if (!fab || !panel) return;

  const state = {
    isLocal: false,
    items: [],
    editingId: null,
    idTouched: false,
    query: '',
    siteOpenForOrders: true
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(value) {
    return String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function defaultItem() {
    const now = new Date().toISOString();
    return {
      id: '',
      name: '',
      description: '',
      image: '',
      price: 0,
      unitLabel: '',
      foodType: 'veg',
      tags: '',
      enabled: true,
      visible: true,
      deliveryType: 'both',
      prepType: 'instant',
      prepHours: 0,
      cutoffMode: 'exact-hours',
      isSameDayAllowed: false,
      availableOrderTypes: [],
      availableDays: [],
      availableTimeSlots: [],
      blackoutDates: [],
      maxAdvanceDays: 0,
      sortOrder: Date.now(),
      createdAt: now,
      updatedAt: now
    };
  }

  const presetTags = [
    { value: 'withoutoniongarlic', label: 'No Onion/Garlic' },
    { value: 'spicy', label: 'Spicy' },
    { value: 'sweet', label: 'Sweet' },
    { value: 'snack', label: 'Snack' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'new', label: 'New' }
  ];

  const presetUnits = [
    { value: 'Half kg', label: 'Half kg' },
    { value: '1 kg', label: '1 kg' },
    { value: '250 g', label: '250 g' },
    { value: '500 g', label: '500 g' },
    { value: '4 pieces', label: '4 pieces' },
    { value: '6 pieces', label: '6 pieces' },
    { value: '10 pieces', label: '10 pieces' },
    { value: 'Pieces', label: 'Pieces' },
    { value: '__other', label: 'Other' }
  ];

  function normalizeTags(tags) {
    const list = Array.isArray(tags)
      ? tags
      : String(tags || '').split(',').map(v => v.trim()).filter(Boolean);
    return [...new Set(list)];
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function normalizeMultiSelect(select) {
    if (!select) return [];
    return Array.from(select.selectedOptions || []).map(option => option.value).filter(Boolean);
  }

  function isCustomUnit(value) {
    return !presetUnits.some(unit => unit.value === value);
  }

  function isPresetTag(value) {
    return presetTags.some(tag => tag.value === value);
  }

  function renderPillGroup(name, options, current, extraAttrs = '') {
    return `
      <div class="admin-pill-group" role="group" aria-label="${escapeHtml(name)}" ${extraAttrs}>
        ${options.map(option => `
          <button type="button"
            class="admin-pill ${current === option.value ? 'is-active' : ''}"
            data-pill-group="${escapeHtml(name)}"
            data-pill-value="${escapeHtml(option.value)}">
            ${escapeHtml(option.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderTagChips(selectedTags) {
    const chips = presetTags.map(tag => `
      <button type="button"
        class="admin-chip ${selectedTags.includes(tag.value) ? 'is-active' : ''}"
        data-tag-chip="${escapeHtml(tag.value)}">
        ${escapeHtml(tag.label)}
      </button>
    `).join('');
    return `
      <div class="admin-chip-row" aria-label="Tags">
        ${chips}
      </div>
    `;
  }

  function renderUnitChips(currentUnit) {
    const commonUnits = presetUnits.filter(unit => unit.value !== '__other');
    return `
      <div class="admin-pill-group" role="group" aria-label="Unit labels">
        ${commonUnits.map(option => `
          <button type="button"
            class="admin-pill ${currentUnit === option.value ? 'is-active' : ''}"
            data-unit-chip="${escapeHtml(option.value)}">
            ${escapeHtml(option.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function render() {
    const editingItem = state.items.find(item => item.id === state.editingId) || defaultItem();
    const currentTags = normalizeTags(editingItem.tags);
    const primaryTag = currentTags.find(tag => isPresetTag(tag)) || '';
    const customTags = currentTags.filter(tag => !isPresetTag(tag));
    const currentUnit = String(editingItem.unitLabel || '');
    const unitIsCustom = isCustomUnit(currentUnit) && currentUnit !== '';
    const prepType = editingItem.prepType === 'advance' ? 'advance' : 'instant';
    const leadTimeHours = Math.max(0, Number(editingItem.prepHours) || 0);
    const availableOrderTypes = normalizeList(editingItem.availableOrderTypes);
    const availableDays = normalizeList(editingItem.availableDays);
    const availableTimeSlots = normalizeList(editingItem.availableTimeSlots);
    const blackoutDates = normalizeList(editingItem.blackoutDates);
    const filteredItems = state.items.filter(item => {
      const haystack = [
        item.name,
        item.id,
        item.description,
        item.tags && item.tags.join(' ')
      ].join(' ').toLowerCase();
      return haystack.includes(state.query.trim().toLowerCase());
    });
    panel.innerHTML = `
      <div class="admin-panel__header">
        <div class="admin-panel__header-row">
          <div class="admin-panel__headline">
            <h2 class="admin-panel__title">Menu Admin</h2>
            <div class="admin-panel__meta">Localhost only. Changes sync immediately.</div>
          </div>
          <button type="button" class="admin-panel__close" id="admin-panel-close" aria-label="Close Menu Admin">
            <i class="fas fa-chevron-right admin-panel__close-icon" aria-hidden="true"></i>
            <span class="admin-panel__close-text">Back</span>
          </button>
        </div>
        <div class="admin-panel__search">
          <input id="admin-search" type="search" placeholder="Search items, ids, tags..." value="${escapeHtml(state.query)}">
        </div>
        <div class="admin-site-switch">
          <label class="admin-switch">
            <input type="checkbox" id="admin-open-toggle" ${state.siteOpenForOrders ? 'checked' : ''}>
            <span>Open for orders</span>
          </label>
          <div class="admin-form__hint">${state.siteOpenForOrders ? 'Customers can place orders.' : 'Ordering is paused for customers.'}</div>
        </div>
      </div>
      <div class="admin-panel__body">
        <div class="admin-panel__section admin-card--items">
          <div class="admin-panel__listhead">
            <h3>Items</h3>
            <span>${filteredItems.length} shown</span>
          </div>
          <div class="admin-items">
            ${filteredItems.map(item => `
              <div class="admin-item">
                <div class="admin-item__row">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <div class="admin-item__meta">${escapeHtml(item.id)} · ${escapeHtml(item.foodType)} · ${item.enabled ? 'enabled' : 'disabled'} · ${item.visible !== false ? 'visible' : 'hidden'}</div>
                  <div class="admin-item__meta">₹${escapeHtml(item.price)}</div>
                    <div class="admin-item__meta">${item.prepType === 'advance' ? `Lead time ${escapeHtml(item.prepHours || 0)}h` : 'Instant prep'}</div>
                  </div>
                  <div class="admin-item__actions">
                    <button class="admin-btn admin-btn--ghost" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
                    <button class="admin-btn admin-btn--ghost" data-action="toggle" data-id="${escapeHtml(item.id)}">${item.enabled ? 'Disable' : 'Enable'}</button>
                    <button class="admin-btn admin-btn--danger" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <form class="admin-form" id="admin-form">
          <input type="hidden" name="sortOrder" value="${escapeHtml(editingItem.sortOrder)}">

          <section class="admin-card admin-card--image">
            <div class="admin-card__header">
              <div>
                <h4>Image</h4>
                <p>Upload once, reuse often.</p>
              </div>
              <label class="admin-switch">
                <input name="enabled" type="checkbox" ${editingItem.enabled !== false ? 'checked' : ''}>
                <span>Enabled</span>
              </label>
              <label class="admin-switch">
                <input name="visible" type="checkbox" ${editingItem.visible !== false ? 'checked' : ''}>
                <span>Visible</span>
              </label>
            </div>
            <div class="admin-image-area">
              <div class="admin-image-preview ${editingItem.image ? '' : 'is-empty'}">
                ${editingItem.image ? `<img src="${escapeHtml(editingItem.image)}" alt="">` : `<span>No image</span>`}
              </div>
              <div class="admin-image-meta">
                <label class="admin-upload-btn" for="admin-image-file">Choose Image</label>
                <input type="file" id="admin-image-file" accept="image/*" style="display:none;">
                <input name="image" required value="${escapeHtml(editingItem.image)}" placeholder="images/example.png">
                <div class="admin-form__hint" id="admin-image-status">Drag in or choose an image file.</div>
              </div>
            </div>
          </section>

          <section class="admin-card admin-card--basics">
            <div class="admin-card__header">
              <div>
                <h4>Basics</h4>
                <p>What customers see first.</p>
              </div>
            </div>
            <label>Name
              <input name="name" required value="${escapeHtml(editingItem.name)}" placeholder="Chocolate Cake">
            </label>
            <label>Description
              <textarea name="description" required placeholder="Short, helpful description...">${escapeHtml(editingItem.description)}</textarea>
            </label>
            <label class="admin-inline-id">ID
              <input name="id" value="${escapeHtml(editingItem.id)}" placeholder="auto_from_name">
              <span class="admin-form__hint">Auto-generated from name unless edited manually.</span>
            </label>
          </section>

          <section class="admin-card admin-card--pricing">
            <div class="admin-card__header">
              <div>
                <h4>Pricing</h4>
                <p>Fast entry for common variants.</p>
              </div>
            </div>
          <input type="hidden" name="foodType" id="admin-food-type" value="${escapeHtml(editingItem.foodType)}">
          <input type="hidden" name="deliveryType" id="admin-delivery-type" value="${escapeHtml(editingItem.deliveryType)}">
          <div class="admin-form__grid">
            <label class="admin-field--price">Price
              <input name="price" class="admin-input--compact" type="number" min="1" required value="${escapeHtml(editingItem.price)}">
            </label>
            <label>Unit label
              <input name="unitLabel" id="admin-unit-label" required value="${escapeHtml(editingItem.unitLabel)}" placeholder="Half kg">
              <div class="admin-form__hint">Use a common label or a custom one.</div>
            </label>
          </div>
          <div class="admin-field-help">
            ${renderUnitChips(currentUnit)}
            <div class="admin-form__hint">Quick unit options</div>
          </div>
          <div class="admin-field-help">
            ${renderPillGroup('foodType', [
              { value: 'veg', label: 'Veg' },
              { value: 'nonveg', label: 'Non-Veg' }
            ], editingItem.foodType)}
            <div class="admin-form__hint">Food type</div>
          </div>
          <div class="admin-field-help">
            ${renderPillGroup('deliveryType', [
              { value: 'both', label: 'Both' },
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' }
            ], editingItem.deliveryType)}
            <div class="admin-form__hint">Delivery type</div>
          </div>
          </section>

          <section class="admin-card admin-card--tags">
            <div class="admin-card__header">
              <div>
                <h4>Tags</h4>
                <p>Tap once for common tags.</p>
              </div>
            </div>
            <input type="hidden" name="tags" id="admin-tags" value="${escapeHtml(currentTags.join(', '))}">
            ${renderTagChips(currentTags)}
            <div class="admin-tag-custom ${customTags.length ? '' : 'is-hidden'}" id="admin-tag-custom-wrap">
              <input id="admin-custom-tags" value="${escapeHtml(customTags.join(', '))}" placeholder="Custom tags, comma separated">
            </div>
            <button type="button" class="admin-link-button" id="admin-add-custom-tag">Add custom tag</button>
          </section>

          <section class="admin-card admin-card--schedule">
            <div class="admin-card__header">
              <div>
                <h4>Scheduling</h4>
                <p>Simple ordering rules for customers.</p>
              </div>
            </div>
            <div class="admin-form__grid">
              <label>Preparation type
                <select name="prepType" id="admin-prep-type">
                  <option value="instant" ${prepType === 'instant' ? 'selected' : ''}>Instant</option>
                  <option value="advance" ${prepType === 'advance' ? 'selected' : ''}>Advance</option>
                </select>
              </label>
              <label id="admin-prep-hours-wrap" style="${prepType === 'advance' ? '' : 'display:none'}">Preparation lead time (hours)
                <input name="prepHours" type="number" min="0" step="1" value="${escapeHtml(leadTimeHours)}" placeholder="24">
              </label>
              <label>Cutoff mode
                <select name="cutoffMode">
                  <option value="exact-hours" ${String(editingItem.cutoffMode || 'exact-hours') === 'exact-hours' ? 'selected' : ''}>Exact hours</option>
                  <option value="slot-based" ${String(editingItem.cutoffMode || 'exact-hours') === 'slot-based' ? 'selected' : ''}>Slot based</option>
                </select>
              </label>
              <label>Same day allowed
                <select name="isSameDayAllowed">
                  <option value="false" ${editingItem.isSameDayAllowed ? '' : 'selected'}>No</option>
                  <option value="true" ${editingItem.isSameDayAllowed ? 'selected' : ''}>Yes</option>
                </select>
              </label>
              <label>Available order types
                <select name="availableOrderTypes" id="admin-order-types" multiple size="3">
                  <option value="pickup" ${availableOrderTypes.includes('pickup') ? 'selected' : ''}>Pickup</option>
                  <option value="delivery" ${availableOrderTypes.includes('delivery') ? 'selected' : ''}>Delivery</option>
                </select>
                <span class="admin-form__hint">Hold Cmd/Ctrl to select more than one.</span>
              </label>
              <label>Available days
                <select name="availableDays" id="admin-available-days" multiple size="5">
                  ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => `
                    <option value="${day}" ${availableDays.includes(day) ? 'selected' : ''}>${day.charAt(0).toUpperCase() + day.slice(1)}</option>
                  `).join('')}
                </select>
              </label>
              <label>Available time slots
                <select name="availableTimeSlots" id="admin-time-slots" multiple size="4">
                  ${((window.FoodSchedule && window.FoodSchedule.DEFAULT_SLOTS) || [
                    { id: 'morning', label: 'Morning' },
                    { id: 'afternoon', label: 'Afternoon' },
                    { id: 'evening', label: 'Evening' }
                  ]).map(slot => `
                    <option value="${escapeHtml(slot.id)}" ${availableTimeSlots.includes(slot.id) ? 'selected' : ''}>${escapeHtml(slot.label)}</option>
                  `).join('')}
                </select>
              </label>
              <label>Blackout dates
                <input name="blackoutDates" value="${escapeHtml(blackoutDates.join(', '))}" placeholder="2026-06-15, 2026-06-16">
              </label>
              <label>Max advance booking days
                <input name="maxAdvanceDays" type="number" min="0" value="${escapeHtml(editingItem.maxAdvanceDays || 0)}" placeholder="7">
              </label>
            </div>
            <div class="admin-form__hint" id="admin-schedule-preview"></div>
          </section>

          <label>Custom unit
            <input name="customUnit" id="admin-unit-preset" value="${escapeHtml(unitIsCustom ? currentUnit : '')}" placeholder="Type custom unit">
            <span class="admin-form__hint">Only needed for uncommon units.</span>
          </label>

          <div class="admin-form__actions admin-form__actions--primary">
            <button type="submit" class="admin-btn admin-btn--primary">${state.editingId ? 'Update Item' : 'Create Item'}</button>
            <button type="button" class="admin-btn admin-btn--ghost" id="admin-reset">Clear</button>
          </div>
        </form>
      </div>
    `;

    panel.querySelector('#admin-reset').addEventListener('click', () => {
      state.editingId = null;
      state.idTouched = false;
      render();
    });

    const searchInput = panel.querySelector('#admin-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.query = searchInput.value;
        render();
      });
    }

    const closeButton = panel.querySelector('#admin-panel-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        panel.classList.remove('open');
      });
    }

    const openToggle = panel.querySelector('#admin-open-toggle');
    if (openToggle) {
      openToggle.addEventListener('change', async () => {
        try {
          await api('api/site-state.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ openForOrders: openToggle.checked })
          });
          state.siteOpenForOrders = openToggle.checked;
          if (window.loadSiteState) {
            await window.loadSiteState();
          }
          if (window.loadMenu) {
            await window.loadMenu();
            window.renderMenu('all');
          }
          render();
        } catch (error) {
          alert(error.message || 'Unable to update open/closed state');
          render();
        }
      });
    }

    const idInput = panel.querySelector('input[name="id"]');
    const nameInput = panel.querySelector('input[name="name"]');
    const imageInput = panel.querySelector('input[name="image"]');
    const unitPreset = panel.querySelector('#admin-unit-preset');
    const unitInput = panel.querySelector('#admin-unit-label');
    const foodTypeInput = panel.querySelector('#admin-food-type');
    const deliveryTypeInput = panel.querySelector('#admin-delivery-type');
    const tagsInput = panel.querySelector('#admin-tags');
    const customTagsInput = panel.querySelector('#admin-custom-tags');
    const fileInput = panel.querySelector('#admin-image-file');
    const imageStatus = panel.querySelector('#admin-image-status');
    const imagePreview = panel.querySelector('.admin-image-preview');
    const addCustomTag = panel.querySelector('#admin-add-custom-tag');
    const prepTypeInput = panel.querySelector('#admin-prep-type');
    const prepHoursWrap = panel.querySelector('#admin-prep-hours-wrap');
    const schedulePreview = panel.querySelector('#admin-schedule-preview');
    const orderTypesSelect = panel.querySelector('#admin-order-types');
    const daysSelect = panel.querySelector('#admin-available-days');
    const slotsSelect = panel.querySelector('#admin-time-slots');

    const syncIdFromName = () => {
      if (!idInput || state.idTouched) return;
      idInput.value = slugify(nameInput?.value || '');
    };

    if (nameInput && idInput) {
      nameInput.addEventListener('input', syncIdFromName);
      idInput.addEventListener('input', () => {
        state.idTouched = true;
      });
      if (!idInput.value) {
        syncIdFromName();
      }
    }

    if (fileInput && imageInput && imageStatus) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        imageStatus.textContent = 'Uploading image...';
        try {
          const formData = new FormData();
          formData.append('image', file);
          const res = await fetch('api/upload-image.php', {
            method: 'POST',
            body: formData
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.success === false) {
            throw new Error(data.error || 'Upload failed');
          }
          imageInput.value = data.path;
          imageStatus.textContent = `Saved as ${data.path}`;
          if (imagePreview) {
            imagePreview.classList.remove('is-empty');
            imagePreview.innerHTML = `<img src="${escapeHtml(data.path)}" alt="">`;
          }
        } catch (error) {
          console.error(error);
          imageStatus.textContent = 'Upload failed. Please try again.';
          alert(error.message || 'Image upload failed');
        }
      });
    }

    if (tagsInput) tagsInput.value = normalizeTags(editingItem.tags).join(', ');
    if (customTagsInput) customTagsInput.value = customTags.join(', ');

    panel.querySelectorAll('[data-pill-group]').forEach(group => {
      group.addEventListener('click', event => {
        const button = event.target.closest('[data-pill-value]');
        if (!button) return;
        const groupName = button.getAttribute('data-pill-group');
        const value = button.getAttribute('data-pill-value');
        const hiddenInput = panel.querySelector(groupName === 'foodType' ? '#admin-food-type' : '#admin-delivery-type');
        if (!hiddenInput) return;
        hiddenInput.value = value;
        panel.querySelectorAll(`[data-pill-group="${groupName}"]`).forEach(el => {
          el.classList.toggle('is-active', el.getAttribute('data-pill-value') === value);
        });
      });
    });

    panel.querySelectorAll('[data-unit-chip]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-unit-chip');
        if (unitInput) unitInput.value = value;
        panel.querySelectorAll('[data-unit-chip]').forEach(el => {
          el.classList.toggle('is-active', el.getAttribute('data-unit-chip') === value);
        });
      });
    });

    panel.querySelectorAll('[data-tag-chip]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-tag-chip');
        button.classList.toggle('is-active');
        const activePresetTags = Array.from(panel.querySelectorAll('[data-tag-chip].is-active'))
          .map(el => el.getAttribute('data-tag-chip'));
        const customValues = String(customTagsInput?.value || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
        if (tagsInput) {
          tagsInput.value = [...new Set([...activePresetTags, ...customValues])].join(', ');
        }
      });
    });

    if (customTagsInput && tagsInput) {
      customTagsInput.addEventListener('input', () => {
        const activePresetTags = Array.from(panel.querySelectorAll('[data-tag-chip].is-active'))
          .map(el => el.getAttribute('data-tag-chip'));
        const customValues = String(customTagsInput.value || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
        tagsInput.value = [...new Set([...activePresetTags, ...customValues])].join(', ');
      });
    }

    if (addCustomTag && customTagsInput) {
      addCustomTag.addEventListener('click', () => {
        customTagsInput.closest('.admin-tag-custom')?.classList.remove('is-hidden');
        customTagsInput.focus();
      });
    }

    if (unitPreset && unitInput) {
      const currentUnit = String(editingItem.unitLabel || '');
      unitPreset.value = isCustomUnit(currentUnit) ? currentUnit : '';
      unitPreset.addEventListener('input', () => {
        unitInput.value = unitPreset.value.trim();
      });
    }

    function updateSchedulePreview() {
      if (!schedulePreview) return;
      const mode = prepTypeInput ? prepTypeInput.value : 'instant';
      const hours = Math.max(0, Number(panel.querySelector('input[name="prepHours"]')?.value || 0));
      schedulePreview.textContent = mode === 'advance'
        ? `Customers must order at least ${hours} hours in advance.`
        : 'This item can be ordered instantly.'
      ;
      if (prepHoursWrap) {
        prepHoursWrap.style.display = mode === 'advance' ? '' : 'none';
      }
    }

    if (prepTypeInput) {
      prepTypeInput.addEventListener('change', updateSchedulePreview);
    }
    panel.querySelector('input[name="prepHours"]')?.addEventListener('input', updateSchedulePreview);
    updateSchedulePreview();

    panel.querySelector('#admin-form').addEventListener('submit', handleSubmit);
    panel.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', handleAction);
    });
  }

  function readForm(form) {
    const fd = new FormData(form);
    const tags = normalizeTags(fd.get('tags'));
    const orderTypesSelect = form.querySelector('select[name="availableOrderTypes"]');
    const daysSelect = form.querySelector('select[name="availableDays"]');
    const slotsSelect = form.querySelector('select[name="availableTimeSlots"]');
    return {
      id: String(fd.get('id') || '').trim(),
      name: String(fd.get('name') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      image: String(fd.get('image') || '').trim(),
      price: Number(fd.get('price') || 0),
      unitLabel: String(fd.get('unitLabel') || '').trim(),
      foodType: String(fd.get('foodType') || 'veg'),
      tags,
      enabled: fd.get('enabled') === 'on',
      visible: fd.get('visible') === 'on',
      deliveryType: String(fd.get('deliveryType') || 'both'),
      prepType: String(fd.get('prepType') || 'instant'),
      prepHours: Math.max(0, Number(fd.get('prepHours') || 0)),
      cutoffMode: String(fd.get('cutoffMode') || 'exact-hours'),
      isSameDayAllowed: fd.get('isSameDayAllowed') === 'true',
      availableOrderTypes: normalizeMultiSelect(orderTypesSelect),
      availableDays: normalizeMultiSelect(daysSelect),
      availableTimeSlots: normalizeMultiSelect(slotsSelect),
      blackoutDates: normalizeList(fd.get('blackoutDates')),
      maxAdvanceDays: Math.max(0, Number(fd.get('maxAdvanceDays') || 0)),
      sortOrder: Number(fd.get('sortOrder') || 0)
    };
  }

  async function refresh() {
    const data = await api('api/menu-read.php?admin=1');
    state.items = data;
    if (state.editingId && !state.items.some(item => item.id === state.editingId)) {
      state.editingId = null;
    }
    render();
    if (window.loadMenu) {
      await window.loadMenu();
      window.renderMenu('all');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const item = readForm(event.currentTarget);
    const action = state.editingId ? 'update' : 'create';
    if (!item.id) {
      item.id = slugify(item.name);
    }
    if (!item.name || !item.description || !item.image || !item.unitLabel || !item.price) {
      alert('Please complete all required fields.');
      return;
    }

    await api('api/menu-write.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, item })
    });
    state.editingId = null;
    state.idTouched = false;
    await refresh();
  }

  async function handleAction(event) {
    const action = event.currentTarget.getAttribute('data-action');
    const id = event.currentTarget.getAttribute('data-id');

    if (action === 'edit') {
      state.editingId = id;
      state.idTouched = false;
      render();
      return;
    }

    if (action === 'toggle') {
      await api('api/menu-write.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id })
      });
      await refresh();
      return;
    }

    if (action === 'delete') {
      if (!confirm('Delete this menu item?')) return;
      await api('api/menu-write.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      await refresh();
    }
  }

  async function init() {
    const env = await api('api/env.php');
    state.isLocal = !!env.isLocal;
    if (!state.isLocal) return;

    fab.style.display = 'block';
    panel.style.display = 'flex';
    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        panel.classList.remove('open');
      }
    });

    try {
      const siteState = await api('api/site-state.php');
      state.siteOpenForOrders = siteState.openForOrders !== false;
    } catch (error) {
      console.warn('Failed to load site state:', error);
    }

    await refresh();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
