function createMockClient() {
  const dummyBuilder: any = {
    select: () => dummyBuilder,
    insert: () => dummyBuilder,
    update: () => dummyBuilder,
    delete: () => dummyBuilder,
    upsert: () => dummyBuilder,
    eq: () => dummyBuilder,
    in: () => dummyBuilder,
    order: () => dummyBuilder,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  return {
    from: () => dummyBuilder,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
}

export const supabase = createMockClient();

export type CustomTask = {
  id: string;
  label: string;
  entry_type: 'checkbox' | 'number';
  sort_order: number;
  created_at: string;
};

export type ChecklistEntry = {
  id: string;
  task_key: string;
  entry_date: string;
  is_done: boolean;
  value: number | null;
  updated_at: string;
};

export type AlarmRow = {
  id: string;
  time: string;
  label: string | null;
  enabled: boolean;
  snooze_enabled: boolean;
  repeat_days: number[] | null;
  loop_ringtone: boolean;
  ringtone_key: string;
  created_at: string;
};
