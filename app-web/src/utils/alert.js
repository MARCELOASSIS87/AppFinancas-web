export function showAlert(title, message) {
  window.alert(message ? `${title}\n\n${message}` : title);
}

export function showConfirm(title, message, onConfirm) {
  const ok = window.confirm(message ? `${title}\n\n${message}` : title);
  if (ok && onConfirm) onConfirm();
}
