import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const base = {
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#6b7280',
  customClass: {
    popup: 'rounded-xl',
    confirmButton: 'rounded-md px-4 py-2 text-sm font-medium',
    cancelButton: 'rounded-md px-4 py-2 text-sm font-medium',
  },
};

/** Delete confirmation — returns true if user confirmed. */
export async function confirmDelete(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Generic confirm action — returns true if user confirmed. */
export async function confirmAction(
  title: string,
  text: string,
  confirmText = 'Confirm',
): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Join live class confirmation — returns true if user confirmed. */
export async function confirmJoinLive(lessonTitle: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: 'Join live class?',
    html: `You are about to join <strong>${escapeHtml(lessonTitle)}</strong> via an external meeting link (Google Meet / Zoom).`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'Join now',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Success toast (non-blocking). */
export function showSuccess(message: string) {
  return Swal.fire({
    ...base,
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });
}

/** Error alert. */
export function showError(message: string) {
  return Swal.fire({
    ...base,
    title: 'Error',
    text: message,
    icon: 'error',
    confirmButtonText: 'OK',
  });
}
