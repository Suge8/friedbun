export async function pullToRefresh(fetchFn, ui) {
  ui.spinning = true;
  try {
    ui.data = await fetchFn();
  } finally {
    ui.spinning = false;
  }
}
