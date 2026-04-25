/*!
 * EZSelect v3.0 — EZone Framework
 * Single/multi custom select: search, tags, groups, select-all,
 * max-cap, taggable, keyboard nav, ARIA, dark theme, async loader
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else factory(root);
}(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';

  /* ── tiny helpers ─────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function uid() { return 'ezs_' + Math.random().toString(36).slice(2, 8); }
  function fire(el, name, detail) {
    el.dispatchEvent(new CustomEvent('ez.select.' + name, { bubbles: true, cancelable: true, detail: detail || {} }));
  }

  /* ── inline SVG icons ─────────────────────────────────── */
  var IC = {
    chevron: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>',
    clear:   '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    check:   '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l4 4 7-8"/></svg>',
    search:  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3"/></svg>',
    remove:  '<svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l8 8M10 2L2 10"/></svg>',
    plus:    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    dash:    '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 8h10"/></svg>',
  };

  /* ════════════════════════════════════════════════════════
   *  EZSelect constructor
   * ════════════════════════════════════════════════════════ */
  function EZSelect(el, options) {
    var src = typeof el === 'string' ? document.querySelector(el) : el;
    if (!src) return;
    if (src._ezSelect) return src._ezSelect;

    this._src  = src;
    this._id   = uid();
    this._open = false;
    this._q    = '';
    this._hlIdx = -1;
    this._asyncTimer = null;
    this._items    = [];
    this._selected = new Set();
    this._visible  = [];

    this.opts = {};
    var defaults = {
      placeholder:       'Select an option',
      searchable:        true,
      searchPlaceholder: 'Search\u2026',
      multiple:          src.multiple || false,
      clearable:         true,
      closeOnSelect:     true,
      selectAll:         false,
      selectAllText:     'Select all',
      maxSelections:     null,
      taggable:          false,
      tagText:           function(v) { return 'Create \u201c' + v + '\u201d'; },
      maxHeight:         260,
      noResults:         'No results found',
      loadingText:       'Loading\u2026',
      async:             null,
      asyncDelay:        220,
      renderOption:      null,
      renderTag:         null,
      onChange:          null,
    };
    for (var k in defaults) this.opts[k] = defaults[k];
    for (var k in (options || {})) this.opts[k] = options[k];

    this._parseSource();
    this._build();
    this._bindEvents();

    src._ezSelect = this;
    return this;
  }

  /* ── parse <select> options ──────────────────────────── */
  EZSelect.prototype._parseSource = function() {
    var self = this;
    self._items = [];

    function walk(parent, group) {
      Array.from(parent.childNodes).forEach(function(node) {
        if (node.tagName === 'OPTGROUP') {
          walk(node, node.label);
        } else if (node.tagName === 'OPTION') {
          var item = {
            value:    node.value,
            label:    node.textContent.trim(),
            group:    group || null,
            disabled: node.disabled,
            selected: node.selected,
          };
          self._items.push(item);
          if (item.selected) self._selected.add(item.value);
        }
      });
    }

    walk(self._src, null);
  };

  /* ── build DOM ───────────────────────────────────────── */
  EZSelect.prototype._build = function() {
    var self = this, o = self.opts, id = self._id;

    var wrap = document.createElement('div');
    wrap.className = 'ezs'
      + (o.multiple   ? ' ezs-multi'    : '')
      + (self._src.disabled ? ' ezs-disabled' : '');
    wrap.setAttribute('role', 'combobox');
    wrap.setAttribute('aria-expanded', 'false');
    wrap.setAttribute('aria-haspopup', 'listbox');
    wrap.setAttribute('tabindex', self._src.disabled ? '-1' : '0');

    /* search row */
    var searchHTML = o.searchable
      ? '<div class="ezs-search-wrap">'
          + '<span class="ezs-search-icon">' + IC.search + '</span>'
          + '<input class="ezs-search-input" type="text"'
          + ' placeholder="' + esc(o.searchPlaceholder) + '"'
          + ' autocomplete="off" spellcheck="false" tabindex="-1">'
          + '</div>'
      : '';

    /* select-all row */
    var selAllHTML = (o.multiple && o.selectAll)
      ? '<div class="ezs-selall-row">'
          + '<span class="ezs-chk" id="' + id + '-sa"></span>'
          + '<span class="ezs-selall-txt">' + esc(o.selectAllText) + '</span>'
          + '</div>'
      : '';

    /* footer count badge */
    var footerHTML = (o.multiple && o.maxSelections)
      ? '<div class="ezs-footer"><span class="ezs-count" id="' + id + '-count">0 / ' + o.maxSelections + '</span></div>'
      : '';

    wrap.innerHTML =
      '<div class="ezs-face" id="' + id + '-face">'
        + '<div class="ezs-values" id="' + id + '-values"></div>'
        + '<div class="ezs-controls">'
          + '<button class="ezs-clear-btn" type="button" tabindex="-1" aria-label="Clear" style="display:none">' + IC.clear + '</button>'
          + '<span class="ezs-arrow">' + IC.chevron + '</span>'
        + '</div>'
      + '</div>'
      + '<div class="ezs-drop" id="' + id + '-drop" role="listbox"'
          + ' aria-multiselectable="' + (o.multiple ? 'true' : 'false') + '"'
          + ' style="display:none">'
        + searchHTML
        + selAllHTML
        + '<div class="ezs-list" id="' + id + '-list" role="presentation"></div>'
        + footerHTML
      + '</div>';

    /* cache refs */
    self._wrap     = wrap;
    self._face     = wrap.querySelector('.ezs-face');
    self._vals     = wrap.querySelector('.ezs-values');
    self._clearBtn = wrap.querySelector('.ezs-clear-btn');
    self._arrow    = wrap.querySelector('.ezs-arrow');
    self._drop     = wrap.querySelector('.ezs-drop');
    self._input    = wrap.querySelector('.ezs-search-input');   /* null if !searchable */
    self._list     = wrap.querySelector('.ezs-list');
    self._saRow    = wrap.querySelector('.ezs-selall-row');
    self._saChk    = wrap.querySelector('#' + id + '-sa');
    self._countEl  = wrap.querySelector('#' + id + '-count');

    /* hide native, insert wrapper after it */
    self._src.style.display = 'none';
    self._src.insertAdjacentElement('afterend', wrap);
    wrap._ezSelectInstance = self;

    self._renderValues();
    self._renderList('');
  };

  /* ── render selected values face ─────────────────────── */
  EZSelect.prototype._renderValues = function() {
    var self = this, o = self.opts;
    var vals = self._vals;
    vals.innerHTML = '';

    var chosen = self._items.filter(function(i) { return self._selected.has(i.value); });

    if (!chosen.length) {
      vals.innerHTML = '<span class="ezs-placeholder">' + esc(o.placeholder) + '</span>';
      self._clearBtn.style.display = 'none';
      return;
    }

    if (o.multiple) {
      chosen.forEach(function(item) {
        var tag = document.createElement('span');
        tag.className = 'ezs-tag';
        if (o.renderTag) {
          tag.innerHTML = o.renderTag(item);
        } else {
          tag.innerHTML =
            '<span class="ezs-tag-text">' + esc(item.label) + '</span>'
            + '<button class="ezs-tag-x" type="button" tabindex="-1"'
              + ' data-v="' + esc(item.value) + '"'
              + ' aria-label="Remove ' + esc(item.label) + '">'
              + IC.remove
            + '</button>';
        }
        vals.appendChild(tag);
      });

      /* update count badge */
      if (self._countEl) {
        self._countEl.textContent = self._selected.size + ' / ' + o.maxSelections;
        self._countEl.classList.toggle('ezs-count-max', self._selected.size >= o.maxSelections);
      }
    } else {
      vals.innerHTML = '<span class="ezs-value-single">' + esc(chosen[0].label) + '</span>';
    }

    self._clearBtn.style.display = (o.clearable && chosen.length) ? '' : 'none';
  };

  /* ── render option list ──────────────────────────────── */
  EZSelect.prototype._renderList = function(rawQuery) {
    var self = this, o = self.opts;
    var q = (rawQuery || '').toLowerCase().trim();
    self._list.innerHTML = '';
    self._hlIdx  = -1;
    self._visible = [];

    /* async path */
    if (o.async && q) { self._runAsync(q); return; }

    /* filter */
    var filtered = self._items.filter(function(item) {
      if (!q) return true;
      return item.label.toLowerCase().indexOf(q) !== -1
          || item.value.toLowerCase().indexOf(q) !== -1;
    });

    /* bucket into groups */
    var groups = {}, ungrouped = [], groupOrder = [];
    filtered.forEach(function(item) {
      if (item.group) {
        if (!groups[item.group]) { groups[item.group] = []; groupOrder.push(item.group); }
        groups[item.group].push(item);
      } else {
        ungrouped.push(item);
      }
    });

    /* build option element */
    var buildOpt = function(item) {
      var isSel = self._selected.has(item.value);
      var el = document.createElement('div');
      el.className = 'ezs-opt'
        + (isSel      ? ' ezs-sel' : '')
        + (item.disabled ? ' ezs-dis' : '');
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', isSel ? 'true' : 'false');
      el.dataset.v = item.value;

      var inner = '';

      /* custom checkbox for multi */
      if (o.multiple) {
        inner += '<span class="ezs-chk' + (isSel ? ' ezs-chk-on' : '') + '">'
               + (isSel ? IC.check : '') + '</span>';
      }

      /* label — with search highlight */
      if (o.renderOption) {
        inner += o.renderOption(item);
      } else {
        var labelHTML = q
          ? item.label.replace(
              new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
              '<mark>$1</mark>'
            )
          : esc(item.label);
        inner += '<span class="ezs-opt-label">' + labelHTML + '</span>';
        if (isSel && !o.multiple) {
          inner += '<span class="ezs-opt-check">' + IC.check + '</span>';
        }
      }

      el.innerHTML = inner;
      self._visible.push(el);
      return el;
    };

    /* render ungrouped first */
    ungrouped.forEach(function(item) { self._list.appendChild(buildOpt(item)); });

    /* render groups */
    groupOrder.forEach(function(gLabel) {
      var grp = document.createElement('div');
      grp.className = 'ezs-group';
      grp.innerHTML = '<div class="ezs-group-lbl">' + esc(gLabel) + '</div>';
      groups[gLabel].forEach(function(item) { grp.appendChild(buildOpt(item)); });
      self._list.appendChild(grp);
    });

    /* empty states */
    if (!self._visible.length) {
      if (o.taggable && q) {
        var cr = document.createElement('div');
        cr.className = 'ezs-opt ezs-create-opt';
        cr.dataset.create = q;
        cr.innerHTML = '<span class="ezs-create-icon">' + IC.plus + '</span>'
                     + '<span>' + esc(o.tagText(q)) + '</span>';
        self._list.appendChild(cr);
      } else {
        self._list.innerHTML = '<div class="ezs-empty">' + esc(o.noResults) + '</div>';
      }
      return;
    }

    self._refreshSelAll();
  };

  /* ── async loader ────────────────────────────────────── */
  EZSelect.prototype._runAsync = function(q) {
    var self = this;
    clearTimeout(self._asyncTimer);
    self._list.innerHTML =
      '<div class="ezs-loading"><span class="ezs-spinner"></span>' + esc(self.opts.loadingText) + '</div>';
    self._asyncTimer = setTimeout(function() {
      self.opts.async(q, function(items) {
        self._items = items;
        self._renderList(q);
      });
    }, self.opts.asyncDelay);
  };

  /* ── update select-all checkbox state ────────────────── */
  EZSelect.prototype._refreshSelAll = function() {
    var self = this;
    if (!self._saChk) return;
    var all     = self._items.filter(function(i) { return !i.disabled; });
    var allSel  = all.length > 0 && all.every(function(i) { return self._selected.has(i.value); });
    var someSel = all.some(function(i) { return self._selected.has(i.value); });

    self._saChk.classList.toggle('ezs-chk-on',      allSel);
    self._saChk.classList.toggle('ezs-chk-partial', !allSel && someSel);
    self._saChk.innerHTML = allSel ? IC.check : (someSel ? IC.dash : '');
  };

  /* ── open / close ────────────────────────────────────── */
  EZSelect.prototype.open = function() {
    var self = this;
    if (self._open || self._wrap.classList.contains('ezs-disabled')) return;

    /* close other open instances */
    document.querySelectorAll('.ezs.ezs-open').forEach(function(w) {
      if (w !== self._wrap && w._ezSelectInstance) w._ezSelectInstance.close();
    });

    self._open = true;
    self._q    = '';
    self._wrap.classList.add('ezs-open');
    self._wrap.setAttribute('aria-expanded', 'true');
    self._drop.style.display = '';

    if (self._input) {
      self._input.value = '';
      /* small delay so the dropdown is visible before focusing */
      setTimeout(function() { self._input.focus(); }, 15);
    }

    self._renderList('');
    self._positionDrop();
    fire(self._src, 'open');
  };

  EZSelect.prototype.close = function() {
    var self = this;
    if (!self._open) return;
    self._open  = false;
    self._hlIdx = -1;
    self._wrap.classList.remove('ezs-open');
    self._wrap.setAttribute('aria-expanded', 'false');
    self._drop.style.display = 'none';
    fire(self._src, 'close');
  };

  EZSelect.prototype.toggle = function() { this._open ? this.close() : this.open(); };

  /* ── smart position (flip above if not enough room) ──── */
  EZSelect.prototype._positionDrop = function() {
    var self  = this;
    var rect  = self._wrap.getBoundingClientRect();
    var spBelow = window.innerHeight - rect.bottom;
    var spAbove = rect.top;
    var maxH  = self.opts.maxHeight;
    var above = spBelow < maxH + 10 && spAbove > maxH + 10;
    self._drop.classList.toggle('ezs-above', above);
    self._drop.style.maxHeight = maxH + 'px';
  };

  /* ── pick / toggle an option ─────────────────────────── */
  EZSelect.prototype._pick = function(value) {
    var self = this, o = self.opts;
    var item = null;
    for (var i = 0; i < self._items.length; i++) {
      if (self._items[i].value === value) { item = self._items[i]; break; }
    }
    if (!item || item.disabled) return;

    if (o.multiple) {
      if (self._selected.has(value)) {
        self._selected.delete(value);
      } else {
        if (o.maxSelections && self._selected.size >= o.maxSelections) return;
        self._selected.add(value);
      }
    } else {
      self._selected.clear();
      self._selected.add(value);
    }

    self._syncNative();
    self._renderValues();
    self._renderList(self._q);

    if (!o.multiple && o.closeOnSelect) self.close();

    var val = self.getValue();
    fire(self._src, 'change', { value: val, item: item });
    if (o.onChange) o.onChange(val, item);
  };

  /* ── create a new custom tag ─────────────────────────── */
  EZSelect.prototype._createTag = function(label) {
    var self = this;
    var value = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');
    if (!value) value = 'tag-' + Date.now();

    /* avoid duplicate values */
    var exists = self._items.some(function(i) { return i.value === value; });
    if (exists) { self._pick(value); return; }

    var item = { value: value, label: label, group: null, disabled: false, selected: true };
    self._items.push(item);

    var opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    opt.selected = true;
    self._src.appendChild(opt);

    self._selected.add(value);
    self._syncNative();
    self._renderValues();

    if (self._input) self._input.value = '';
    self._q = '';
    self._renderList('');

    fire(self._src, 'change', { value: self.getValue(), item: item });
    if (self.opts.onChange) self.opts.onChange(self.getValue(), item);
  };

  /* ── sync selection back to native <select> ──────────── */
  EZSelect.prototype._syncNative = function() {
    var self = this;
    Array.from(self._src.options).forEach(function(opt) {
      opt.selected = self._selected.has(opt.value);
    });
    /* fire native change for form libs */
    try { self._src.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
  };

  /* ── toggle select all ───────────────────────────────── */
  EZSelect.prototype._toggleSelAll = function() {
    var self = this, o = self.opts;
    var eligible = self._items.filter(function(i) { return !i.disabled; });
    var allSel   = eligible.every(function(i) { return self._selected.has(i.value); });

    if (allSel) {
      self._selected.clear();
    } else {
      var limit = o.maxSelections || Infinity;
      self._selected.clear();
      var count = 0;
      eligible.forEach(function(i) {
        if (count < limit) { self._selected.add(i.value); count++; }
      });
    }
    self._syncNative();
    self._renderValues();
    self._renderList(self._q);
  };

  /* ── keyboard handler ────────────────────────────────── */
  EZSelect.prototype._onKey = function(e) {
    var self = this;
    var items = self._list.querySelectorAll('.ezs-opt:not(.ezs-dis)');

    if (!self._open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        self.open();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        self.close();
        self._wrap.focus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        self._hlIdx = Math.min(self._hlIdx + 1, items.length - 1);
        self._applyHL(items);
        break;

      case 'ArrowUp':
        e.preventDefault();
        self._hlIdx = Math.max(self._hlIdx - 1, 0);
        self._applyHL(items);
        break;

      case 'Enter':
        e.preventDefault();
        if (self._hlIdx >= 0 && items[self._hlIdx]) {
          var el = items[self._hlIdx];
          if (el.dataset.create) self._createTag(el.dataset.create);
          else if (el.dataset.v) self._pick(el.dataset.v);
        }
        break;

      case 'Backspace':
        /* remove last tag on backspace when input is empty */
        if (self.opts.multiple && self._input && self._input.value === '') {
          e.preventDefault();
          var vals = Array.from(self._selected);
          if (vals.length) self._pick(vals[vals.length - 1]);
        }
        break;

      case 'Tab':
        self.close();
        break;
    }
  };

  EZSelect.prototype._applyHL = function(items) {
    var self = this;
    Array.from(items).forEach(function(el, i) {
      el.classList.toggle('ezs-hl', i === self._hlIdx);
    });
    if (items[self._hlIdx]) items[self._hlIdx].scrollIntoView({ block: 'nearest' });
  };

  /* ── bind all events ─────────────────────────────────── */
  EZSelect.prototype._bindEvents = function() {
    var self = this;

    /* face click → toggle */
    self._face.addEventListener('mousedown', function(e) {
      var isClear  = e.target.closest && e.target.closest('.ezs-clear-btn');
      var isTagX   = e.target.closest && e.target.closest('.ezs-tag-x');
      if (isClear || isTagX) return;
      e.preventDefault();
      self.toggle();
    });

    /* clear button */
    self._clearBtn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      self.clear();
    });

    /* tag × remove */
    self._vals.addEventListener('mousedown', function(e) {
      var btn = e.target.closest ? e.target.closest('.ezs-tag-x') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      self._pick(btn.dataset.v);
    });

    /* search input */
    if (self._input) {
      self._input.addEventListener('input', function() {
        self._q = self._input.value;
        self._renderList(self._q);
      });
      self._input.addEventListener('keydown', function(e) { self._onKey(e); });
      self._input.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    }

    /* option list click */
    self._list.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var opt = e.target.closest ? e.target.closest('.ezs-opt') : null;
      if (!opt) return;
      if (opt.dataset.create) { self._createTag(opt.dataset.create); return; }
      if (opt.dataset.v) self._pick(opt.dataset.v);
    });

    /* select all row */
    if (self._saRow) {
      self._saRow.addEventListener('mousedown', function(e) {
        e.preventDefault();
        self._toggleSelAll();
      });
    }

    /* keyboard on wrapper */
    self._wrap.addEventListener('keydown', function(e) { self._onKey(e); });

    /* click outside → close */
    self._clickOut = function(e) {
      if (!self._wrap.contains(e.target)) self.close();
    };
    document.addEventListener('mousedown', self._clickOut);

    /* reposition on resize/scroll */
    self._onResize = function() { if (self._open) self._positionDrop(); };
    window.addEventListener('resize', self._onResize, { passive: true });
    window.addEventListener('scroll', self._onResize, { passive: true, capture: true });
  };

  /* ══════════════════════════════════════════════════════
   *  Public API
   * ══════════════════════════════════════════════════════ */

  /** Returns current value. Array for multiple, string|null for single. */
  EZSelect.prototype.getValue = function() {
    var vals = Array.from(this._selected);
    return this.opts.multiple ? vals : (vals.length ? vals[0] : null);
  };

  /** Set value programmatically. Accepts string or array. */
  EZSelect.prototype.setValue = function(value) {
    var self = this;
    self._selected.clear();
    var arr = Array.isArray(value) ? value : (value == null ? [] : [value]);
    arr.forEach(function(v) {
      var sv = String(v);
      var found = self._items.some(function(i) { return i.value === sv; });
      if (found) self._selected.add(sv);
    });
    self._syncNative();
    self._renderValues();
    self._renderList(self._q);
  };

  /** Clear all selections. */
  EZSelect.prototype.clear = function() {
    this._selected.clear();
    this._syncNative();
    this._renderValues();
    this._renderList(this._q);
    fire(this._src, 'change', { value: null });
    if (this.opts.onChange) this.opts.onChange(null, null);
  };

  EZSelect.prototype.enable  = function() {
    this._wrap.classList.remove('ezs-disabled');
    this._wrap.setAttribute('tabindex', '0');
  };
  EZSelect.prototype.disable = function() {
    this._wrap.classList.add('ezs-disabled');
    this._wrap.setAttribute('tabindex', '-1');
    this.close();
  };

  /** Replace all options. items: [{value, label, group?, disabled?, selected?}] */
  EZSelect.prototype.setOptions = function(items) {
    this._items = items || [];
    this._selected = new Set(this._items.filter(function(i) { return i.selected; }).map(function(i) { return i.value; }));
    this._renderValues();
    this._renderList(this._q);
  };

  /** Remove the widget and restore the original <select>. */
  EZSelect.prototype.destroy = function() {
    document.removeEventListener('mousedown', this._clickOut);
    window.removeEventListener('resize',  this._onResize);
    window.removeEventListener('scroll',  this._onResize, { capture: true });
    this._wrap.remove();
    this._src.style.display = '';
    delete this._src._ezSelect;
  };

  /* ── auto-init from data attributes ─────────────────── */
  EZSelect.init = function(root) {
    (root || document).querySelectorAll('[data-ez="select2"], [data-ezs]').forEach(function(el) {
      if (el._ezSelect) return;

      var o = {};
      var d = el.dataset;
      if (d.ezPlaceholder)  o.placeholder     = d.ezPlaceholder;
      if (d.ezSearchable)   o.searchable      = d.ezSearchable !== 'false';
      if (d.ezClearable)    o.clearable       = d.ezClearable  !== 'false';
      if (d.ezSelectAll  !== undefined) o.selectAll  = true;
      if (d.ezTaggable   !== undefined) o.taggable   = true;
      if (d.ezMax)          o.maxSelections   = parseInt(d.ezMax, 10);
      if (el.multiple)      o.multiple        = true;

      new EZSelect(el, o);
    });
  };

  /* ── register ────────────────────────────────────────── */
  if (typeof root !== 'undefined') {
    root.EZone          = root.EZone || {};
    root.EZone.EZSelect = EZSelect;
  }

  /* auto-init on page load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { EZSelect.init(); });
  } else {
    EZSelect.init();
  }

  return EZSelect;
}));
