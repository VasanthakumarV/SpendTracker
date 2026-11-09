
export async function persist_storage() {
  try {
    const s = navigator.storage;
    if (!s || !s.persist) return false;
    if (await s.persisted()) return true;
    return await s.persist();
  } catch (e) {
    return false;
  }
}
