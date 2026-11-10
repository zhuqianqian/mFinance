// 表单控件：文本使用浮动标签，日期使用普通行内标签。
import { h, uid } from './util.js';

export function fieldControl(label, control, { hint = '', suffix = '', compact = false } = {}) {
  if (control.tagName === 'INPUT' && control.type === 'date') return inlineField(label, control, { hint, compact });
  const id = control.id || uid();
  control.id = id;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const isInput = control.tagName === 'INPUT' || control.tagName === 'TEXTAREA';
  const isStatic = !isInput;
  if (isInput && !control.placeholder) control.placeholder = ' ';
  const labelable = isInput || control.tagName === 'SELECT' || control.tagName === 'BUTTON';
  if (!labelable) {
    control.setAttribute('role', 'group');
    control.setAttribute('aria-labelledby', labelId);
  }
  if (hint) control.setAttribute('aria-describedby', hintId);
  return h('div', { class: 'field floating-field' + (compact ? ' compact-field' : '') }, [
    h('div', { class: 'floating-control' + (isStatic ? ' label-raised' : '') }, [
      control,
      h(labelable ? 'label' : 'span', { id: labelId, for: labelable ? id : null, class: 'floating-label', text: label }),
      // legend 为边框留出缺口，标签本身无需用实色背景遮挡边框。
      h('fieldset', { class: 'field-outline', 'aria-hidden': 'true' }, [
        h('legend', {}, [h('span', { text: label })])
      ]),
      suffix ? h('span', { class: 'field-unit', 'aria-hidden': 'true', text: suffix }) : null
    ]),
    hint ? h('div', { id: hintId, class: 'hint', text: hint }) : null
  ]);
}

export function inlineField(label, control, { hint = '', compact = false } = {}) {
  const id = control.id || uid();
  control.id = id;
  control.classList.add('inline-control');
  if (hint) control.setAttribute('aria-describedby', `${id}-hint`);
  return h('div', { class: 'field inline-field' + (compact ? ' inline-compact' : '') }, [
    h('div', { class: 'inline-label' }, [
      h('label', { for: id, text: label }),
      hint ? h('div', { id: `${id}-hint`, class: 'hint', text: hint }) : null
    ]),
    control
  ]);
}

export function segmentedField(label, control) {
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', label);
  return h('div', { class: 'field segmented-field' }, [control]);
}

export function inputField(label, { type = 'text', value = '', placeholder = '', hint = '', suffix = '', compact = false, oninput, onchange } = {}) {
  const input = h('input', {
    type: type === 'number' ? 'text' : type,
    inputmode: type === 'number' ? 'decimal' : null,
    value: value ?? '', placeholder: type === 'date' ? null : placeholder || ' ',
    oninput, onchange
  });
  return fieldControl(label, input, { hint, suffix, compact });
}
