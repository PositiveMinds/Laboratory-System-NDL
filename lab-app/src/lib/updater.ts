import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import Swal from 'sweetalert2';

export async function checkForUpdates(silent = false) {
  let update;
  try {
    update = await check();
  } catch (err) {
    if (!silent) {
      Swal.fire({ icon: 'error', title: 'Update Check Failed', text: err instanceof Error ? err.message : String(err), confirmButtonColor: '#78001d' });
    }
    return;
  }

  if (!update) {
    if (!silent) {
      Swal.fire({ icon: 'info', title: "You're Up to Date", text: 'No new updates are available.', confirmButtonColor: '#78001d' });
    }
    return;
  }

  const result = await Swal.fire({
    icon: 'info',
    title: `Update Available: v${update.version}`,
    html: update.body
      ? `<div style="text-align:left;max-height:200px;overflow:auto;white-space:pre-wrap">${update.body}</div>`
      : 'A new version is ready to install.',
    showCancelButton: true,
    confirmButtonText: 'Update Now',
    cancelButtonText: 'Later',
    confirmButtonColor: '#78001d',
  });
  if (!result.isConfirmed) return;

  Swal.fire({
    title: 'Downloading Update…',
    text: 'The app will restart automatically once installed.',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Update Failed', text: err instanceof Error ? err.message : String(err), confirmButtonColor: '#78001d' });
  }
}
