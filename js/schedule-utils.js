(function (global) {
  const DEFAULT_SLOTS = [
    { id: 'morning', label: 'Morning', start: '09:00', end: '12:00' },
    { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '16:00' },
    { id: 'evening', label: 'Evening', start: '16:00', end: '20:00' }
  ];

  const WEEKDAY_INDEX = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  function cloneDate(date) {
    return new Date(date.getTime());
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeDateInput(dateValue) {
    if (!dateValue) return '';
    const value = String(dateValue).trim();
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '' : value.slice(0, 10);
  }

  function toDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseTimeToMinutes(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function startOfLocalDay(date) {
    const d = cloneDate(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addHours(date, hours) {
    return new Date(date.getTime() + (Number(hours) || 0) * 60 * 60 * 1000);
  }

  function getSlotStartDateTime(selectedDate, slot) {
    const date = new Date(`${normalizeDateInput(selectedDate)}T00:00:00`);
    const minutes = parseTimeToMinutes(slot && slot.start);
    if (Number.isNaN(date.getTime()) || minutes === null) return null;
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
  }

  function getSlotEndDateTime(selectedDate, slot) {
    const date = new Date(`${normalizeDateInput(selectedDate)}T00:00:00`);
    const minutes = parseTimeToMinutes(slot && slot.end);
    if (Number.isNaN(date.getTime()) || minutes === null) return null;
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
  }

  function getSlotLabel(slot) {
    if (!slot) return '';
    if (slot.label && slot.start && slot.end) {
      return `${slot.label} (${formatSlotTime(slot.start)} - ${formatSlotTime(slot.end)})`;
    }
    return slot.label || slot.id || '';
  }

  function formatSlotTime(timeValue) {
    const minutes = parseTimeToMinutes(timeValue);
    if (minutes === null) return String(timeValue || '');
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${normalizedHour}:${pad(minute)} ${suffix}`;
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.slice();
    if (value == null || value === '') return [];
    return String(value)
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }

  function normalizeItemSchedule(item) {
    const prepType = item && item.prepType === 'advance' ? 'advance' : 'instant';
    const prepHours = Math.max(0, Number(item && item.prepHours) || 0);
    const cutoffMode = item && item.cutoffMode === 'slot-based' ? 'slot-based' : 'exact-hours';
    const isSameDayAllowed = item && item.isSameDayAllowed === true;
    return {
      prepType,
      prepHours,
      cutoffMode,
      isSameDayAllowed,
      availableOrderTypes: normalizeArray(item && item.availableOrderTypes).filter(Boolean),
      availableDays: normalizeArray(item && item.availableDays).filter(Boolean),
      availableTimeSlots: normalizeArray(item && item.availableTimeSlots).filter(Boolean),
      blackoutDates: normalizeArray(item && item.blackoutDates).map(normalizeDateInput).filter(Boolean),
      maxAdvanceDays: Math.max(0, Number(item && item.maxAdvanceDays) || 0),
      leadTimeByOrderType: item && typeof item.leadTimeByOrderType === 'object' && item.leadTimeByOrderType ? item.leadTimeByOrderType : {},
      timeSlots: Array.isArray(item && item.timeSlots) ? item.timeSlots : DEFAULT_SLOTS
    };
  }

  function getOrderTypeLeadTime(item, orderType) {
    const schedule = normalizeItemSchedule(item);
    const explicit = Number(schedule.leadTimeByOrderType[orderType]);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return schedule.prepType === 'advance' ? schedule.prepHours : 0;
  }

  function getEarliestAllowedDateTime(cartItems, orderType, now = new Date()) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    let maxHours = 0;
    for (const item of items) {
      const schedule = normalizeItemSchedule(item);
      if (schedule.availableOrderTypes.length && orderType && !schedule.availableOrderTypes.includes(orderType)) {
        return addHours(now, 99999);
      }
      const leadTime = getOrderTypeLeadTime(item, orderType);
      maxHours = Math.max(maxHours, leadTime);
    }
    return addHours(now, maxHours);
  }

  function isDateAllowedForItem(item, selectedDate) {
    const schedule = normalizeItemSchedule(item);
    const dateKey = normalizeDateInput(selectedDate);
    if (!dateKey) return false;
    if (schedule.blackoutDates.includes(dateKey)) return false;
    if (schedule.availableDays.length) {
      const weekday = new Date(`${dateKey}T00:00:00`).getDay();
      const allowedDays = schedule.availableDays.map(day => {
        if (/^\d+$/.test(String(day))) return Number(day);
        return WEEKDAY_INDEX[String(day).toLowerCase()];
      }).filter(day => Number.isInteger(day));
      if (allowedDays.length && !allowedDays.includes(weekday)) return false;
    }
    return true;
  }

  function isSlotValid(item, slot, selectedDate, orderType, now = new Date()) {
    const schedule = normalizeItemSchedule(item);
    if (!slot || !selectedDate) return false;
    if (schedule.availableOrderTypes.length && orderType && !schedule.availableOrderTypes.includes(orderType)) return false;
    if (!isDateAllowedForItem(item, selectedDate)) return false;
    if (schedule.availableTimeSlots.length && slot.id && !schedule.availableTimeSlots.includes(slot.id)) return false;

    const leadTimeHours = getOrderTypeLeadTime(item, orderType);
    const threshold = addHours(now, leadTimeHours);
    const start = getSlotStartDateTime(selectedDate, slot);
    if (!start) return false;
    return start.getTime() >= threshold.getTime();
  }

  function getValidSlotsForDate(cartItems, selectedDate, orderType, now = new Date()) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    const allSlots = items.reduce((list, item) => {
      const schedule = normalizeItemSchedule(item);
      const slots = schedule.timeSlots.length ? schedule.timeSlots : DEFAULT_SLOTS;
      return list.length ? list.filter(slot => slots.some(candidate => candidate.id === slot.id)) : slots.slice();
    }, []);

    const firstItem = items[0];
    const slots = (allSlots.length ? allSlots : DEFAULT_SLOTS).filter(slot => {
      return items.every(item => isSlotValid(item, slot, selectedDate, orderType, now));
    });

    return slots;
  }

  function getFirstAvailableDate(cartItems, orderType, now = new Date(), maxDaysToScan = 30) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    for (let i = 0; i <= maxDaysToScan; i += 1) {
      const probe = cloneDate(now);
      probe.setDate(probe.getDate() + i);
      const dateKey = toDateKey(probe);
      if (!items.every(item => isDateAllowedForItem(item, dateKey))) continue;
      const slots = getValidSlotsForDate(items, dateKey, orderType, now);
      if (slots.length) {
        return { date: dateKey, slot: slots[0] };
      }
    }
    return null;
  }

  function validateCartSchedule(cartItems, selectedDate, selectedSlot, orderType, now = new Date()) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    if (!items.length) {
      return { valid: false, message: 'Cart is empty.' };
    }

    const earliestAllowedDateTime = getEarliestAllowedDateTime(items, orderType, now);
    const normalizedDate = normalizeDateInput(selectedDate);
    const firstSlots = items.length ? normalizeItemSchedule(items[0]).timeSlots : DEFAULT_SLOTS;
    const slot = typeof selectedSlot === 'object'
      ? (selectedSlot.start ? selectedSlot : (firstSlots.find(s => s.id === selectedSlot.id) || selectedSlot))
      : (firstSlots.find(s => s.id === selectedSlot) || null);

    if (!normalizedDate) {
      return { valid: false, message: 'Please choose a delivery date.' };
    }
    if (!slot) {
      return { valid: false, message: 'Please choose a delivery time slot.' };
    }

    const slotStart = getSlotStartDateTime(normalizedDate, slot);
    if (!slotStart) {
      return { valid: false, message: 'Selected time slot is invalid.' };
    }

    if (slotStart.getTime() < earliestAllowedDateTime.getTime()) {
      return { valid: false, message: `This cart requires at least ${Math.ceil((earliestAllowedDateTime.getTime() - now.getTime()) / 3600000)} hours preparation.` };
    }

    const validSlots = getValidSlotsForDate(items, normalizedDate, orderType, now);
    if (!validSlots.some(candidate => candidate.id === slot.id)) {
      return { valid: false, message: 'Selected slot is no longer available for all cart items.' };
    }

    return { valid: true, earliestAllowedDateTime, validSlots };
  }

  function formatEarliestSlotMessage(cartItems, orderType, now = new Date()) {
    const earliest = getFirstAvailableDate(cartItems, orderType, now);
    if (!earliest) return 'No available slots found.';
    const readableDate = new Date(`${earliest.date}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    return `Earliest available slot: ${readableDate}, ${formatSlotTime(earliest.slot.start)}`;
  }

  global.FoodSchedule = {
    DEFAULT_SLOTS,
    normalizeItemSchedule,
    getEarliestAllowedDateTime,
    isSlotValid,
    getValidSlotsForDate,
    getFirstAvailableDate,
    validateCartSchedule,
    formatSlotTime,
    formatEarliestSlotMessage,
    normalizeDateInput,
    toDateKey
  };
})(window);
