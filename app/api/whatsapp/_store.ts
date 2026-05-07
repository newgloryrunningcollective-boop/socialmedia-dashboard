export type StoredWhatsAppMessage = {
  id: string;
  direction: "inbound" | "outbound" | "status";
  from: string | null;
  to: string | null;
  text: string | null;
  mediaType?: string | null;
  mediaId?: string | null;
  timestamp: string;
  status?: string | null;
};

const STORE_KEY = "__social_dashboard_whatsapp_messages__";

type WhatsAppGlobalStore = typeof globalThis & {
  [STORE_KEY]?: StoredWhatsAppMessage[];
};

function getStore() {
  const store = globalThis as WhatsAppGlobalStore;
  if (!store[STORE_KEY]) store[STORE_KEY] = [];
  return store[STORE_KEY];
}

export function readWhatsAppMessages() {
  return getStore().slice(-100).reverse();
}

export function addWhatsAppMessage(message: StoredWhatsAppMessage) {
  const store = getStore();
  store.push(message);
  if (store.length > 150) store.splice(0, store.length - 150);
}
