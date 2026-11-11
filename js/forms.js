// 统一的朴素表单控件：标签与控件默认同排，必要时可改为整行。
import { h, uid } from './util.js';

export function fieldControl(label, control, { hint = '', suffix = '', compact = false, stacked = false, hideLabel = false } = {}) {
  const id = control.id || uid();
  control.id = id;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const labelable = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(control.tagName);
  if (hideLabel) control.setAttribute('aria-label', control.getAttribute('aria-label') || label);
  else if (!labelable) {
    control.setAttribute('role', 'group');
    control.setAttribute('aria-labelledby', labelId);
  }
  if (hint) control.setAttribute('aria-describedby', hintId);

  const classes = ['field', 'form-field'];
  if (compact) classes.push('compact-field');
  if (stacked) classes.push('stacked-field');
  if (hideLabel) classes.push('unlabeled-field');
  return h('div', { class: classes.join(' ') }, [
    hideLabel ? null : h(labelable ? 'label' : 'span', {
      id: labelId, for: labelable ? id : null, class: 'form-label', text: label
    }),
    h('div', { class: 'form-control' }, [
      control,
      suffix ? h('span', { class: 'field-unit', 'aria-hidden': 'true', text: suffix }) : null
    ]),
    hint ? h('div', { id: hintId, class: 'field-hint', text: hint }) : null
  ]);
}

export function inlineField(label, control, options = {}) {
  return fieldControl(label, control, options);
}

export function segmentedField(label, control) {
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', label);
  return h('div', { class: 'field segmented-field' }, [control]);
}

export function inputField(label, { type = 'text', value = '', placeholder = '', hint = '', suffix = '', compact = false, stacked = false, hideLabel = false, oninput, onchange } = {}) {
  const input = h('input', {
    type: type === 'number' ? 'text' : type,
    inputmode: type === 'number' ? 'decimal' : null,
    value: value ?? '', placeholder: type === 'date' ? null : placeholder,
    oninput, onchange
  });
  return fieldControl(label, input, { hint, suffix, compact, stacked, hideLabel });
}
