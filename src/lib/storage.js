export const LS = {
  accountsKey: 'ns_accounts_v22',
  layersKey: 'ns_layers_v22',
  networksKey: 'ns_networks_v22',
  sessionKey: 'ns_session_v22',
  objectsKey: 'ns_objects_v22',
  chatKey: 'ns_chat_v22',
  groupsKey: 'ns_groups_v22',
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      // noop
    }
  }
};

export function loadState() {
  return {
    accounts: LS.get(LS.accountsKey, []),
    layers: LS.get(LS.layersKey, [{ id: 'default', name: 'Default', active: true, visible: true }]),
    networks: LS.get(LS.networksKey, [{ id: 'net_default', name: 'Default Network', active: true, population: 1, income: 0 }]),
    objects: LS.get(LS.objectsKey, []),
    session: LS.get(LS.sessionKey, null),
    unitMode: localStorage.getItem('ns_units') || 'imperial',
    chatMessages: LS.get(LS.chatKey, []),
    groups: LS.get(LS.groupsKey, [{ id: 'grp_default', name: 'General', members: [] }])
  };
}

export function persistState(state) {
  LS.set(LS.accountsKey, state.accounts);
  LS.set(LS.layersKey, state.layers);
  LS.set(LS.networksKey, state.networks);
  LS.set(LS.objectsKey, state.objects);
  LS.set(LS.sessionKey, state.session);
  LS.set(LS.chatKey, state.chatMessages);
  LS.set(LS.groupsKey, state.groups);
  localStorage.setItem('ns_units', state.unitMode);
}
