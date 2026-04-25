(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var result = factory();
  root.EZDateTimePicker = result.EZDateTimePicker;
  if (root.EZone) root.EZone.EZDateTimePicker = result.EZDateTimePicker;
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

/**
 * EZone Framework — EZDateTimePicker
 * Full-featured date/time picker. Zero dependencies.
 *
 * Modes:  'date' | 'time' | 'datetime' | 'daterange'
 * Views:  days → months → years (drill-down)
 *
 * Place in: js/ezone-datetimepicker.js
 * @version 1.0.0
 */

class EZDateTimePicker {

  /* ─── Constructor ─────────────────────────────────────────── */
  constructor(selector, options = {}) {
    this.el = typeof selector === 'string'
      ? document.querySelector(selector) : selector;
    if (!this.el) throw new Error('EZDateTimePicker: element not found');
    if (this.el._ezDtp) return this.el._ezDtp;

    this.opts = {
      mode:        'date',        // 'date' | 'time' | 'datetime' | 'daterange'
      format:      null,          // auto by mode if null
      firstDay:    1,             // 0=Sun 1=Mon
      minDate:     null,
      maxDate:     null,
      defaultDate: null,
      showToday:   true,
      showClear:   true,
      showApply:   false,         // show explicit Apply button (range mode auto-enables)
      closeOnSelect: true,
      hour12:      false,
      presets:     null,          // array of {label, start, end} for range mode
      events:      [],            // [{date:'YYYY-MM-DD', label, color}]
      placeholder: null,
      weekNumbers: false,
      locale:      'en',
      onOpen:      null,
      onClose:     null,
      onChange:    null,          // fn(value)  — value is Date|{start,end}|string
      onSelect:    null,          // fn(value)  — fires on confirmed selection
      ...options,
    };

    // Auto-format
    if (!this.opts.format) {
      this.opts.format = {
        date:      'DD/MM/YYYY',
        time:      this.opts.hour12 ? 'hh:mm A' : 'HH:mm',
        datetime:  this.opts.hour12 ? 'DD/MM/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm',
        daterange: 'DD/MM/YYYY',
      }[this.opts.mode];
    }

    // State
    this._open      = false;
    this._view      = 'days';        // 'days' | 'months' | 'years'
    this._viewDate  = new Date();    // month/year being shown
    this._viewDate2 = null;          // second calendar month (range)
    this._selected  = null;          // Date (single) or {start, end} (range)
    this._hoverDate = null;
    this._rangeStep = 0;             // 0=pick start, 1=pick end
    this._hour      = 0;
    this._minute    = 0;
    this._ampm      = 'AM';
    this._dragUnit  = null;          // 'hour'|'minute' when dragging

    // Apply defaultDate
    if (this.opts.defaultDate) this._applyDefaultDate(this.opts.defaultDate);

    this._build();
    this._attach();
    this.el._ezDtp = this;
  }

  /* ─── Build DOM ───────────────────────────────────────────── */
  _build() {
    this._wrap = document.createElement('div');
    this._wrap.className = 'ez-dtp';

    // ── Trigger ──
    this._trigger = document.createElement('div');
    this._trigger.className = 'ez-dtp-trigger';

    this._input = document.createElement('input');
    this._input.className = 'ez-dtp-input';
    this._input.type       = 'text';
    this._input.readOnly   = true;
    this._input.placeholder = this.opts.placeholder || {
      date:      'DD/MM/YYYY',
      time:      this.opts.hour12 ? 'hh:mm AM' : 'HH:mm',
      datetime:  'DD/MM/YYYY HH:mm',
      daterange: 'Start date → End date',
    }[this.opts.mode];

    // Copy attributes from original element
    if (this.el.id)        this._input.id        = this.el.id;
    if (this.el.name)      this._input.name      = this.el.name;
    if (this.el.className) this._input.classList.add(...this.el.classList);
    this._input.classList.add('ez-dtp-input');

    const iconSVG = this.opts.mode === 'time'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    const iconEl  = document.createElement('span');
    iconEl.className = 'ez-dtp-icon';
    iconEl.innerHTML = iconSVG;

    const clearEl = document.createElement('button');
    clearEl.className = 'ez-dtp-clear';
    clearEl.type      = 'button';
    clearEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    clearEl.addEventListener('click', e => { e.stopPropagation(); this.clear(); });

    this._trigger.appendChild(this._input);
    this._trigger.appendChild(iconEl);
    this._trigger.appendChild(clearEl);

    // ── Panel ──
    this._panel = document.createElement('div');
    this._panel.className = 'ez-dtp-panel';

    if (this.opts.mode === 'daterange') {
      this._panel.classList.add('ez-dtp-range-panel');
      this._buildRangePanel();
    } else if (this.opts.mode === 'time') {
      this._buildTimePanel();
    } else {
      this._buildDatePanel(this._panel, true);
      if (this.opts.mode === 'datetime') this._buildTimeSection(this._panel);
      this._buildFooter(this._panel);
    }

    this._wrap.appendChild(this._trigger);
    this._wrap.appendChild(this._panel);

    // Replace original element
    this.el.parentNode.insertBefore(this._wrap, this.el);
    this._wrap.appendChild(this.el);
    this.el.style.display = 'none';

    this._renderCalendar();
  }

  /* ─── Build: date calendar panel ─────────────────────────── */
  _buildDatePanel(container, main = false) {
    const cal = document.createElement('div');
    if (!main) cal.className = 'ez-dtp-range-cal';

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'ez-dtp-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'ez-dtp-nav-btn ez-dtp-prev';
    prevBtn.type = 'button';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>';
    prevBtn.addEventListener('click', () => this._navMonth(-1, cal));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'ez-dtp-nav-btn ez-dtp-next';
    nextBtn.type = 'button';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>';
    nextBtn.addEventListener('click', () => this._navMonth(1, cal));

    const titleWrap = document.createElement('div');
    titleWrap.className = 'ez-dtp-header-title';

    const monthBtn = document.createElement('button');
    monthBtn.className = 'ez-dtp-month-btn';
    monthBtn.type = 'button';
    monthBtn.addEventListener('click', () => this._switchView('months', cal));

    const yearBtn = document.createElement('button');
    yearBtn.className = 'ez-dtp-year-btn';
    yearBtn.type = 'button';
    yearBtn.addEventListener('click', () => this._switchView('years', cal));

    titleWrap.appendChild(monthBtn);
    titleWrap.appendChild(yearBtn);
    hdr.appendChild(prevBtn);
    hdr.appendChild(titleWrap);
    hdr.appendChild(nextBtn);

    // Day-of-week row
    const dow = document.createElement('div');
    dow.className = 'ez-dtp-dow';

    // Days grid
    const days = document.createElement('div');
    days.className = 'ez-dtp-days';

    // Month/Year grids (hidden by default)
    const months = document.createElement('div');
    months.className = 'ez-dtp-months';
    months.style.display = 'none';

    const years = document.createElement('div');
    years.className = 'ez-dtp-years';
    years.style.display = 'none';

    cal.appendChild(hdr);
    cal.appendChild(dow);
    cal.appendChild(days);
    cal.appendChild(months);
    cal.appendChild(years);

    // Store refs
    cal._dtpMonthBtn = monthBtn;
    cal._dtpYearBtn  = yearBtn;
    cal._dtpDow      = dow;
    cal._dtpDays     = days;
    cal._dtpMonths   = months;
    cal._dtpYears    = years;
    cal._dtpPrev     = prevBtn;
    cal._dtpNext     = nextBtn;
    cal._isSecond    = false;

    container.appendChild(cal);
    if (main) this._mainCal = cal;
    return cal;
  }

  /* ─── Build: range panel ──────────────────────────────────── */
  _buildRangePanel() {
    const body = document.createElement('div');
    body.style.display = 'flex';

    // Optional presets sidebar
    if (this.opts.presets && this.opts.presets.length) {
      const sidebar = document.createElement('div');
      sidebar.className = 'ez-dtp-presets';
      this.opts.presets.forEach((preset, i) => {
        if (preset === 'separator') {
          const sep = document.createElement('div');
          sep.className = 'ez-dtp-preset-sep';
          sidebar.appendChild(sep);
          return;
        }
        const btn = document.createElement('button');
        btn.className = 'ez-dtp-preset-btn';
        btn.type = 'button';
        btn.textContent = preset.label;
        btn.dataset.presetIdx = i;
        btn.addEventListener('click', () => this._applyPreset(preset, btn));
        sidebar.appendChild(btn);
      });
      body.appendChild(sidebar);
      this._presetSidebar = sidebar;
    }

    // Two calendars
    const calsWrap = document.createElement('div');
    calsWrap.className = 'ez-dtp-range-calendars';

    const cal1 = this._buildDatePanel(calsWrap);
    cal1._isFirst = true;

    const divider = document.createElement('div');
    divider.className = 'ez-dtp-range-divider';
    calsWrap.appendChild(divider);

    const cal2 = this._buildDatePanel(calsWrap);
    cal2._isSecond = true;
    this._secondCal = cal2;

    // Offset second calendar by one month
    this._viewDate2 = new Date(this._viewDate);
    this._viewDate2.setMonth(this._viewDate2.getMonth() + 1);

    body.appendChild(calsWrap);
    this._panel.appendChild(body);
    this._mainCal = cal1;
    this._buildFooter(this._panel, true);
  }

  /* ─── Build: time section ─────────────────────────────────── */
  _buildTimeSection(container) {
    const section = document.createElement('div');
    section.className = 'ez-dtp-time';

    this._buildTimeDrums(section);
    container.appendChild(section);
  }

  /* ─── Build: standalone time panel ───────────────────────── */
  _buildTimePanel() {
    const wrap = document.createElement('div');
    wrap.className = 'ez-dtp-time-scroll-wrap';

    const title = document.createElement('div');
    title.className = 'ez-dtp-time-scroll-title';
    title.textContent = 'Select time';

    const drums = document.createElement('div');
    drums.className = 'ez-dtp-time';
    this._buildTimeDrums(drums);

    wrap.appendChild(title);
    wrap.appendChild(drums);
    this._panel.appendChild(wrap);
    this._buildFooter(this._panel);
  }

  /* ─── Build: time drums ───────────────────────────────────── */
  _buildTimeDrums(container) {
    const arrowUp   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>';
    const arrowDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';

    const makeCol = (unit, max, step = 1) => {
      const col = document.createElement('div');
      col.className = 'ez-dtp-time-col';

      const lbl = document.createElement('div');
      lbl.className = 'ez-dtp-time-label';
      lbl.textContent = unit === 'hour' ? 'Hour' : 'Min';

      const up = document.createElement('button');
      up.className = 'ez-dtp-time-btn';
      up.type = 'button';
      up.innerHTML = arrowUp;
      up.addEventListener('click', () => this._adjustTime(unit, step));

      const val = document.createElement('div');
      val.className = 'ez-dtp-time-val';
      val.dataset.unit = unit;

      // Scroll wheel
      val.addEventListener('wheel', e => {
        e.preventDefault();
        this._adjustTime(unit, e.deltaY < 0 ? step : -step);
      }, { passive: false });

      // Drag to change
      let dragStartY = 0, dragStart = 0;
      val.addEventListener('mousedown', e => {
        dragStartY = e.clientY;
        dragStart  = unit === 'hour' ? this._hour : this._minute;
        this._dragUnit = unit;
        const onMove = mv => {
          const delta = Math.round((dragStartY - mv.clientY) / 8) * step;
          if (unit === 'hour') {
            this._hour = this._clamp(dragStart + delta, 0, this.opts.hour12 ? 11 : 23);
          } else {
            this._minute = this._clamp(dragStart + delta, 0, 59);
          }
          this._renderTimeDisplays();
        };
        const onUp = () => {
          this._dragUnit = null;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      const dn = document.createElement('button');
      dn.className = 'ez-dtp-time-btn';
      dn.type = 'button';
      dn.innerHTML = arrowDown;
      dn.addEventListener('click', () => this._adjustTime(unit, -step));

      col.appendChild(lbl);
      col.appendChild(up);
      col.appendChild(val);
      col.appendChild(dn);
      container.appendChild(col);

      if (unit === 'hour') this._hourDisp = val;
      else this._minDisp = val;
      return col;
    };

    makeCol('hour', this.opts.hour12 ? 12 : 24);

    const sep = document.createElement('div');
    sep.className = 'ez-dtp-time-sep';
    sep.textContent = ':';
    container.appendChild(sep);

    makeCol('minute', 60, 5);

    // AM/PM
    if (this.opts.hour12) {
      const ampmWrap = document.createElement('div');
      ampmWrap.className = 'ez-dtp-ampm';
      ['AM', 'PM'].forEach(v => {
        const btn = document.createElement('button');
        btn.className = 'ez-dtp-ampm-btn' + (this._ampm === v ? ' ez-dtp-ampm-active' : '');
        btn.type = 'button';
        btn.textContent = v;
        btn.dataset.ampm = v;
        btn.addEventListener('click', () => {
          this._ampm = v;
          this._renderTimeDisplays();
        });
        ampmWrap.appendChild(btn);
      });
      container.appendChild(ampmWrap);
      this._ampmWrap = ampmWrap;
    }
  }

  /* ─── Build: footer ───────────────────────────────────────── */
  _buildFooter(container, forRange = false) {
    const footer = document.createElement('div');
    footer.className = 'ez-dtp-footer';

    const left  = document.createElement('div');
    left.className = 'ez-dtp-footer-left';
    const right = document.createElement('div');
    right.className = 'ez-dtp-footer-right';

    if (this.opts.showToday && this.opts.mode !== 'time') {
      const todayBtn = document.createElement('button');
      todayBtn.className = 'ez-dtp-foot-btn ez-dtp-foot-today';
      todayBtn.type = 'button';
      todayBtn.textContent = 'Today';
      todayBtn.addEventListener('click', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this._viewDate = new Date(today);
        if (this.opts.mode === 'date') { this._selectDate(today); }
        else { this._renderCalendar(); }
      });
      left.appendChild(todayBtn);
    }

    if (this.opts.showClear) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'ez-dtp-foot-btn ez-dtp-foot-clear';
      clearBtn.type = 'button';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => this.clear());
      left.appendChild(clearBtn);
    }

    // Apply button (always for range, optional for others)
    if (forRange || this.opts.showApply || this.opts.mode === 'datetime') {
      const applyBtn = document.createElement('button');
      applyBtn.className = 'ez-dtp-foot-btn ez-dtp-foot-apply';
      applyBtn.type = 'button';
      applyBtn.textContent = 'Apply';
      applyBtn.addEventListener('click', () => this._applySelection());
      right.appendChild(applyBtn);
    }

    footer.appendChild(left);
    footer.appendChild(right);
    container.appendChild(footer);
  }

  /* ─── Attach to DOM ───────────────────────────────────────── */
  _attach() {
    // Open/close on input click
    this._input.addEventListener('click', () => this._open ? this.close() : this.open());

    // Close on outside click
    this._outsideHandler = e => {
      if (!this._wrap.contains(e.target)) this.close();
    };

    // Keyboard
    this._input.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Enter')  this._open ? this.close() : this.open();
    });
  }

  /* ─── Open / Close ────────────────────────────────────────── */
  open() {
    if (this._open) return;
    this._open = true;
    this._panel.classList.add('ez-dtp-panel-open');
    this._input.classList.add('ez-dtp-open');
    this._renderCalendar();
    this._adjustPanelPosition();
    document.addEventListener('mousedown', this._outsideHandler);
    if (typeof this.opts.onOpen === 'function') this.opts.onOpen();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this._panel.classList.remove('ez-dtp-panel-open');
    this._input.classList.remove('ez-dtp-open');
    document.removeEventListener('mousedown', this._outsideHandler);
    if (typeof this.opts.onClose === 'function') this.opts.onClose();
  }

  toggle() { this._open ? this.close() : this.open(); }

  /* ─── Position panel ──────────────────────────────────────── */
  _adjustPanelPosition() {
    const rect = this._wrap.getBoundingClientRect();
    const panelW = this._panel.offsetWidth || 300;
    if (rect.left + panelW > window.innerWidth - 16) {
      this._panel.classList.add('ez-dtp-align-right');
    } else {
      this._panel.classList.remove('ez-dtp-align-right');
    }
  }

  /* ─── Render calendar ─────────────────────────────────────── */
  _renderCalendar() {
    if (this.opts.mode === 'time') {
      this._renderTimeDisplays();
      return;
    }
    this._renderCal(this._mainCal, this._viewDate);
    if (this._secondCal) {
      const d = this._viewDate2 || (() => {
        const d2 = new Date(this._viewDate);
        d2.setMonth(d2.getMonth() + 1);
        return d2;
      })();
      this._renderCal(this._secondCal, d);
    }
    if (this.opts.mode !== 'daterange') this._renderTimeDisplays();
  }

  _renderCal(cal, viewDate) {
    const view = cal._dtpView || 'days';

    // Hide/show grids based on view
    cal._dtpDow.style.display    = view === 'days'   ? '' : 'none';
    cal._dtpDays.style.display   = view === 'days'   ? '' : 'none';
    cal._dtpMonths.style.display = view === 'months' ? '' : 'none';
    cal._dtpYears.style.display  = view === 'years'  ? '' : 'none';

    const monthNames = this._monthNames();
    cal._dtpMonthBtn.textContent = monthNames[viewDate.getMonth()];
    cal._dtpYearBtn.textContent  = viewDate.getFullYear();

    if (view === 'days')   this._renderDays(cal, viewDate);
    if (view === 'months') this._renderMonths(cal, viewDate);
    if (view === 'years')  this._renderYears(cal, viewDate);
  }

  /* ─── Render days grid ────────────────────────────────────── */
  _renderDays(cal, viewDate) {
    // DOW row
    const dows = this._dowNames();
    cal._dtpDow.innerHTML = '';
    dows.forEach(d => {
      const s = document.createElement('span');
      s.textContent = d;
      cal._dtpDow.appendChild(s);
    });

    cal._dtpDays.innerHTML = '';

    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const today = new Date(); today.setHours(0,0,0,0);

    // Pad start
    let startPad = first.getDay() - this.opts.firstDay;
    if (startPad < 0) startPad += 7;

    for (let pi = 0; pi < startPad; pi++) {
      const pd = new Date(year, month, -startPad + pi + 1);
      cal._dtpDays.appendChild(this._makeDayBtn(pd, cal, true));
    }

    for (let di = 1; di <= last.getDate(); di++) {
      const date = new Date(year, month, di);
      cal._dtpDays.appendChild(this._makeDayBtn(date, cal, false));
    }

    // Pad end to fill 6 rows × 7
    const total = startPad + last.getDate();
    const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let ti = 1; ti <= remainder; ti++) {
      const td = new Date(year, month + 1, ti);
      cal._dtpDays.appendChild(this._makeDayBtn(td, cal, true));
    }
  }

  _makeDayBtn(date, cal, otherMonth) {
    const btn = document.createElement('button');
    btn.className = 'ez-dtp-day';
    btn.type = 'button';
    btn.textContent = date.getDate();
    btn.dataset.date = this._fmt(date, 'YYYY-MM-DD');

    const today = new Date(); today.setHours(0,0,0,0);
    if (this._sameDay(date, today)) btn.classList.add('ez-dtp-day-today');
    if (otherMonth)                 btn.classList.add('ez-dtp-day-other');

    // Disabled
    if (this._isDisabled(date)) {
      btn.classList.add('ez-dtp-day-disabled');
      btn.disabled = true;
      return btn;
    }

    // Event dot
    const eKey = this._fmt(date, 'YYYY-MM-DD');
    if (this.opts.events.some(e => e.date === eKey)) {
      btn.classList.add('ez-dtp-day-has-event');
    }

    // Selection state
    this._applySelectionClasses(btn, date);

    // Hover range preview
    if (this.opts.mode === 'daterange' && this._rangeStep === 1) {
      btn.addEventListener('mouseenter', () => {
        this._hoverDate = date;
        this._renderCalendar();
      });
    }

    btn.addEventListener('click', () => this._selectDate(date));
    return btn;
  }

  _applySelectionClasses(btn, date) {
    if (this.opts.mode === 'daterange') {
      const sel = this._selected;
      const start = sel?.start;
      const end   = sel?.end || (this._rangeStep === 1 ? this._hoverDate : null);

      if (start && this._sameDay(date, start)) btn.classList.add('ez-dtp-day-range-start');
      if (end   && this._sameDay(date, end))   btn.classList.add('ez-dtp-day-range-end');
      if (start && end) {
        const lo = start < end ? start : end;
        const hi = start < end ? end   : start;
        if (date > lo && date < hi) btn.classList.add('ez-dtp-day-in-range');
      }
    } else {
      if (this._selected && this._sameDay(date, this._selected)) {
        btn.classList.add('ez-dtp-day-selected');
      }
    }
  }

  /* ─── Render months grid ──────────────────────────────────── */
  _renderMonths(cal, viewDate) {
    cal._dtpMonths.innerHTML = '';
    const names = this._monthNames();
    names.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = 'ez-dtp-month-cell';
      btn.type = 'button';
      btn.textContent = name.slice(0, 3);

      if (i === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear()) {
        btn.classList.add('ez-dtp-cell-today');
      }
      if (i === viewDate.getMonth()) btn.classList.add('ez-dtp-cell-active');

      btn.addEventListener('click', () => {
        viewDate.setMonth(i);
        if (cal._isSecond) this._viewDate2 = new Date(viewDate);
        else               this._viewDate  = new Date(viewDate);
        this._switchView('days', cal);
      });
      cal._dtpMonths.appendChild(btn);
    });
  }

  /* ─── Render years grid ───────────────────────────────────── */
  _renderYears(cal, viewDate) {
    cal._dtpYears.innerHTML = '';
    const base = Math.floor(viewDate.getFullYear() / 12) * 12;
    cal._dtpYearBtn.textContent = `${base}–${base + 11}`;

    for (let y = base; y < base + 12; y++) {
      const btn = document.createElement('button');
      btn.className = 'ez-dtp-year-cell';
      btn.type = 'button';
      btn.textContent = y;

      if (y === new Date().getFullYear()) btn.classList.add('ez-dtp-cell-today');
      if (y === viewDate.getFullYear())   btn.classList.add('ez-dtp-cell-active');

      btn.addEventListener('click', () => {
        viewDate.setFullYear(y);
        if (cal._isSecond) this._viewDate2 = new Date(viewDate);
        else               this._viewDate  = new Date(viewDate);
        this._switchView('months', cal);
      });
      cal._dtpYears.appendChild(btn);
    }
  }

  /* ─── View switching ──────────────────────────────────────── */
  _switchView(view, cal) {
    cal._dtpView = view;
    const vd = cal._isSecond ? this._viewDate2 : this._viewDate;
    this._renderCal(cal, vd);
  }

  /* ─── Month navigation ────────────────────────────────────── */
  _navMonth(delta, cal) {
    if (cal._dtpView === 'years') {
      const vd = cal._isSecond ? this._viewDate2 : this._viewDate;
      vd.setFullYear(vd.getFullYear() + delta * 12);
      this._renderCal(cal, vd);
      return;
    }
    if (cal._dtpView === 'months') {
      const vd = cal._isSecond ? this._viewDate2 : this._viewDate;
      vd.setFullYear(vd.getFullYear() + delta);
      this._renderCal(cal, vd);
      return;
    }

    if (this.opts.mode === 'daterange') {
      // Move both calendars together
      this._viewDate.setMonth(this._viewDate.getMonth() + delta);
      this._viewDate2 = new Date(this._viewDate);
      this._viewDate2.setMonth(this._viewDate2.getMonth() + 1);
      this._renderCalendar();
    } else {
      this._viewDate.setMonth(this._viewDate.getMonth() + delta);
      this._renderCalendar();
    }
  }

  /* ─── Date selection ──────────────────────────────────────── */
  _selectDate(date) {
    if (this.opts.mode === 'daterange') {
      if (this._rangeStep === 0) {
        this._selected  = { start: date, end: null };
        this._rangeStep = 1;
        this._hoverDate = null;
        this._renderCalendar();
      } else {
        const start = this._selected.start;
        const end   = date;
        this._selected  = start <= end ? { start, end } : { start: end, end: start };
        this._rangeStep = 0;
        this._hoverDate = null;
        this._renderCalendar();
        this._updateInput();
        this._fireChange();
        if (this.opts.closeOnSelect && !this.opts.showApply) {
          setTimeout(() => this.close(), 80);
        }
      }
      return;
    }

    this._selected = new Date(date);
    if (this.opts.mode === 'datetime') {
      this._selected.setHours(this._realHour(), this._minute, 0, 0);
    }
    this._renderCalendar();
    this._updateInput();
    this._fireChange();

    if (this.opts.closeOnSelect && this.opts.mode === 'date') {
      setTimeout(() => this.close(), 80);
    }
  }

  /* ─── Apply / confirm selection ──────────────────────────── */
  _applySelection() {
    if (this.opts.mode === 'datetime' && this._selected) {
      this._selected.setHours(this._realHour(), this._minute, 0, 0);
    }
    if (this.opts.mode === 'time') {
      const d = this._selected || new Date();
      d.setHours(this._realHour(), this._minute, 0, 0);
      this._selected = d;
    }
    this._updateInput();
    this._fireChange();
    if (typeof this.opts.onSelect === 'function') this.opts.onSelect(this._getValue());
    this.close();
  }

  /* ─── Time adjustments ────────────────────────────────────── */
  _adjustTime(unit, delta) {
    if (unit === 'hour') {
      const max = this.opts.hour12 ? 11 : 23;
      this._hour = ((this._hour + delta) % (max + 1) + (max + 1)) % (max + 1);
    } else {
      this._minute = ((this._minute + delta) % 60 + 60) % 60;
    }
    this._renderTimeDisplays();
    // For datetime mode, keep selected date in sync
    if (this.opts.mode === 'datetime' && this._selected) {
      this._selected.setHours(this._realHour(), this._minute, 0, 0);
    }
  }

  _realHour() {
    if (!this.opts.hour12) return this._hour;
    if (this._ampm === 'AM') return this._hour === 12 ? 0 : this._hour;
    return this._hour === 12 ? 12 : this._hour + 12;
  }

  _renderTimeDisplays() {
    if (this._hourDisp) {
      const h = this.opts.hour12
        ? (this._hour === 0 ? 12 : this._hour)
        : this._hour;
      this._hourDisp.textContent = String(h).padStart(2, '0');
    }
    if (this._minDisp) {
      this._minDisp.textContent = String(this._minute).padStart(2, '0');
    }
    if (this._ampmWrap) {
      this._ampmWrap.querySelectorAll('.ez-dtp-ampm-btn').forEach(btn => {
        btn.classList.toggle('ez-dtp-ampm-active', btn.dataset.ampm === this._ampm);
      });
    }
  }

  /* ─── Presets ─────────────────────────────────────────────── */
  _applyPreset(preset, btn) {
    if (this._presetSidebar) {
      this._presetSidebar.querySelectorAll('.ez-dtp-preset-btn').forEach(b => b.classList.remove('ez-dtp-preset-active'));
      btn.classList.add('ez-dtp-preset-active');
    }
    const start = this._parseDate(preset.start);
    const end   = this._parseDate(preset.end);
    this._selected  = { start, end };
    this._rangeStep = 0;
    this._viewDate  = new Date(start);
    this._viewDate2 = new Date(start);
    this._viewDate2.setMonth(this._viewDate2.getMonth() + 1);
    this._renderCalendar();
    this._updateInput();
    this._fireChange();
  }

  /* ─── Input update ────────────────────────────────────────── */
  _updateInput() {
    const val = this._getDisplayValue();
    this._input.value = val || '';
    this._trigger.classList.toggle('ez-dtp-has-value', !!val);
    // Sync hidden original input
    this.el.value = val || '';
  }

  _getDisplayValue() {
    if (!this._selected) return '';
    if (this.opts.mode === 'daterange') {
      const s = this._selected;
      if (!s.start) return '';
      if (!s.end)   return this._fmt(s.start, this.opts.format);
      return `${this._fmt(s.start, this.opts.format)} → ${this._fmt(s.end, this.opts.format)}`;
    }
    if (this.opts.mode === 'time') {
      return this._fmtTime();
    }
    if (this.opts.mode === 'datetime') {
      return `${this._fmt(this._selected, 'DD/MM/YYYY')} ${this._fmtTime()}`;
    }
    return this._fmt(this._selected, this.opts.format);
  }

  _fmtTime() {
    const h = this.opts.hour12
      ? (this._hour === 0 ? 12 : this._hour)
      : this._hour;
    const t = `${String(h).padStart(2,'0')}:${String(this._minute).padStart(2,'0')}`;
    return this.opts.hour12 ? `${t} ${this._ampm}` : t;
  }

  /* ─── Events ──────────────────────────────────────────────── */
  _fireChange() {
    const val = this._getValue();
    if (typeof this.opts.onChange === 'function') this.opts.onChange(val);
    this._wrap.dispatchEvent(new CustomEvent('ez.dtp.change', {
      bubbles: true, detail: { value: val }
    }));
  }

  _getValue() {
    if (this.opts.mode === 'daterange') return this._selected;
    return this._selected || null;
  }

  /* ─── Utilities ───────────────────────────────────────────── */
  _sameDay(a, b) {
    return a?.getFullYear() === b?.getFullYear() &&
           a?.getMonth()    === b?.getMonth()    &&
           a?.getDate()     === b?.getDate();
  }

  _isDisabled(date) {
    const min = this.opts.minDate ? this._parseDate(this.opts.minDate) : null;
    const max = this.opts.maxDate ? this._parseDate(this.opts.maxDate) : null;
    if (min) { const lo = new Date(min); lo.setHours(0,0,0,0); if (date < lo) return true; }
    if (max) { const hi = new Date(max); hi.setHours(23,59,59,999); if (date > hi) return true; }
    return false;
  }

  _clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  _parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      // YYYY-MM-DD or DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val + 'T00:00:00');
      const parts = val.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      }
    }
    return new Date(val);
  }

  _applyDefaultDate(val) {
    if (this.opts.mode === 'daterange' && typeof val === 'object' && val.start) {
      this._selected  = { start: this._parseDate(val.start), end: val.end ? this._parseDate(val.end) : null };
      this._viewDate  = new Date(this._selected.start);
      this._viewDate2 = new Date(this._viewDate);
      this._viewDate2.setMonth(this._viewDate2.getMonth() + 1);
    } else {
      this._selected = this._parseDate(val);
      this._viewDate = new Date(this._selected);
      if (this.opts.mode === 'datetime' || this.opts.mode === 'time') {
        this._hour   = this._selected.getHours();
        this._minute = this._selected.getMinutes();
        if (this.opts.hour12) {
          this._ampm = this._hour >= 12 ? 'PM' : 'AM';
          this._hour = this._hour % 12;
        }
      }
    }
    setTimeout(() => this._updateInput(), 0);
  }

  _fmt(date, format) {
    if (!date) return '';
    const d  = String(date.getDate()).padStart(2, '0');
    const m  = String(date.getMonth() + 1).padStart(2, '0');
    const y  = date.getFullYear();
    const mn = this._monthNames();
    return format
      .replace('MMMM', mn[date.getMonth()])
      .replace('MMM',  mn[date.getMonth()].slice(0, 3))
      .replace('MM',   m)
      .replace('DD',   d)
      .replace('YYYY', y)
      .replace('YY',   String(y).slice(-2));
  }

  _monthNames() {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i, 1).toLocaleString(this.opts.locale, { month: 'long' })
    );
  }

  _dowNames() {
    const names = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(2000, 0, 2 + ((i + this.opts.firstDay) % 7));
      names.push(d.toLocaleString(this.opts.locale, { weekday: 'short' }).slice(0, 2));
    }
    return names;
  }

  /* ─── Public API ──────────────────────────────────────────── */
  getValue()  { return this._getValue(); }
  getDisplay(){ return this._getDisplayValue(); }

  setDate(val) {
    this._selected = this._parseDate(val);
    this._viewDate = new Date(this._selected);
    this._renderCalendar();
    this._updateInput();
  }

  setRange(start, end) {
    this._selected  = { start: this._parseDate(start), end: this._parseDate(end) };
    this._viewDate  = new Date(this._selected.start);
    this._viewDate2 = new Date(this._viewDate);
    this._viewDate2.setMonth(this._viewDate2.getMonth() + 1);
    this._renderCalendar();
    this._updateInput();
  }

  clear() {
    this._selected  = null;
    this._rangeStep = 0;
    this._hoverDate = null;
    this._updateInput();
    this._renderCalendar();
    this._fireChange();
  }

  setMinDate(val) { this.opts.minDate = val; this._renderCalendar(); }
  setMaxDate(val) { this.opts.maxDate = val; this._renderCalendar(); }

  addEvent(event) {
    this.opts.events.push(event);
    this._renderCalendar();
  }

  removeEvent(date) {
    const key = this._fmt(this._parseDate(date), 'YYYY-MM-DD');
    this.opts.events = this.opts.events.filter(e => e.date !== key);
    this._renderCalendar();
  }

  destroy() {
    document.removeEventListener('mousedown', this._outsideHandler);
    this._wrap.parentNode?.insertBefore(this.el, this._wrap);
    this.el.style.display = '';
    this._wrap.remove();
    delete this.el._ezDtp;
  }

  /* ─── Auto-init ───────────────────────────────────────────── */
  static init(scope = document) {
    scope.querySelectorAll('[data-ez-dtp]:not([data-ez-dtp-initialized])').forEach(el => {
      new EZDateTimePicker(el, {
        mode:        el.dataset.ezDtpMode     || 'date',
        format:      el.dataset.ezDtpFormat   || null,
        minDate:     el.dataset.ezDtpMin      || null,
        maxDate:     el.dataset.ezDtpMax      || null,
        hour12:      el.dataset.ezDtpHour12   === 'true',
        placeholder: el.dataset.ezDtpPlaceholder || null,
      });
      el.setAttribute('data-ez-dtp-initialized', 'true');
    });
  }
}
  return { EZDateTimePicker };
}));
