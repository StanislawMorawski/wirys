import { ref, computed } from 'vue'

export type Locale = 'en' | 'pl'

const DEFAULT: Locale = 'en'
const LOCALE_KEY = 'wirys_locale'

export const locale = ref<Locale>((localStorage.getItem(LOCALE_KEY) as Locale) || DEFAULT)

export function setLocale(l: Locale) {
  locale.value = l
  localStorage.setItem(LOCALE_KEY, l)
}

export function getLocale(): Locale {
  return locale.value
}

const dicts: Record<Locale, Record<string, string>> = {
  en: {
    nav_chores: 'Chores',
    nav_exercises: 'Exercises',
    nav_groceries: 'Groceries',
    nav_settings: 'Settings',
    chores_title: '🏠 Chores',
    add: 'Add',
    add_chore: 'Add Chore',
    calendar: 'Calendar',
    sync: 'Sync',
    syncing: 'Syncing...',
    save_token: 'Save token',
    clear: 'Clear',
    gist_id: 'Gist ID (leave empty to create)',
    save_id: 'Save ID',
    save_full: 'Save full snapshot',
    load_full: 'Load full snapshot',
    minimal_title: 'Minimal sync (chores only):',
    save_minimal: 'Save minimal (last completions)',
    load_replace: 'Load (replace)',
    load_merge: 'Load (merge)',
    status: 'Status:',
    tip_tokens: 'Tip: create a token at github.com/settings/tokens with the gist scope.',

    // Additional UI strings
    gist_sync_title: 'Gist Sync',
    gist_sync_desc: 'Store synced metadata in a GitHub Gist file.',
    open_gist: 'Open gist',

    loading: 'Loading...',

    recent_history: 'Recent History',
    close: 'Close',
    chores_calendar: 'Chores Calendar',
    // History / modals
    history_title: 'History',
    history_no_entries: 'No history yet. Mark this item as complete to start tracking!',
    history_list: 'List',
    history_calendar: 'Calendar',
    entries_on: 'Entries on',
    delete_entry_confirm: 'Delete this history entry?',
    delete_no_id: 'Cannot delete: entry has no ID',
    delete_entry_failed: 'Failed to delete entry: ',
    delete_entry: 'Delete entry',

    // Trackable form
    field_name: 'Name *',
    field_description: 'Description',
    field_repeat: 'Repeat every',
    unit_days: 'Days',
    unit_weeks: 'Weeks',
    unit_months: 'Months',
    unit_day_singular: 'Day',
    unit_week_singular: 'Week',
    unit_month_singular: 'Month',
    every: 'Every',
    exercise_target_label: 'Target amount per period',
    exercise_target_help: 'Missing this target will accumulate as debt',
    cancel: 'Cancel',
    save: 'Save',

    // Trackable card / list
    never: 'Never',
    never_done: 'Never done',
    today: 'Today',
    yesterday: 'Yesterday',
    days_ago: 'days ago',
    weeks_ago: 'weeks ago',
    months_ago: 'months ago',
    times: 'times',
    last_done: 'Last done:',
    mark_done: 'Mark as done',
    complete: 'Complete',
    completeToday: 'Complete today',
    logExercise: 'Log exercise',
    updated: 'Updated',
    view_history: 'View history',
    viewHistory: 'View history',
    edit: 'Edit',
    overdue: 'days overdue',

    // Log exercise modal
    log_title: 'Log',
    debt_to_pay: 'Debt to pay off:',
    all_caught_up: '✓ All caught up! You can do 1 day in advance.',
    already_done: "🎉 You've already done tomorrow's exercise! Take a rest.",
    amount_label: 'Amount',
    notes_optional: 'Notes (optional)',
    log_button: 'Log',

    // Exercise card
    debt_label: 'Debt:',
    done_label: '✓ Done',
    ahead_label: 'ahead',
    todo_label: 'Todo',
    total_label: 'total',
    debt_from_past: 'debt from past periods',
    today_label: 'Today:',

    // Exercises / Groceries
    exercises_title: 'Exercises',
    add_exercise: 'Add Exercise',
    exercise_debt_title: 'Exercise debt to pay off',
    exercise_debt_sub: 'You have pending exercises - time to catch up!',
    exercises_empty: 'No exercises yet for {name}.',

    groceries_title: 'Groceries',
    clear_done: 'Clear done',
    placeholder_add_item: 'Add item...',
    placeholder_qty: 'Qty',
    grocery_empty_title: 'Your grocery list is empty.',
    grocery_empty_sub: 'Add items above to get started!',
    done_section: 'Done',

    // People / users
    people_title: 'Users',
    people_desc: 'Create, select, and delete users.',
    add_person: 'Add person',
    add_person_button: 'Create',
    emoji_label: 'Emoji',
    people_selected: 'Selected',
    delete_person_confirm: 'Delete this user?',
    delete_disabled_last_person: 'Cannot delete the last user.',
    people_showing_for: 'Showing for: {name}',
    select: 'Select',

    // Calendar / misc
    chore_completions_month: 'Chore completions this month: {count}',
    no_entries_month: 'No entries in this month.',
    events_this_item: 'Events this item: {count} • Year: {year} • Month: {month}',
    delete: 'Delete',
    language: 'Language',
    lang_en: 'English',
    lang_pl: 'Polski',

    // Units
    unit_reps: 'Reps',
    unit_km: 'Kilometers',
    unit_steps: 'Steps',
    unit_minutes: 'Minutes',
    unit_sets: 'Sets'

  },
  pl: {
    nav_chores: 'Obowiązki',
    nav_exercises: 'Ćwiczenia',
    nav_groceries: 'Zakupy',
    nav_settings: 'Ustawienia',
    chores_title: '🏠 Obowiązki',
    add: 'Dodaj',
    add_chore: 'Dodaj obowiązek',
    calendar: 'Kalendarz',
    sync: 'Synchronizuj',
    syncing: 'Synchronizuję...',
    save_token: 'Zapisz token',
    clear: 'Wyczyść',
    gist_id: 'ID Gist (pozostaw puste by utworzyć)',
    save_id: 'Zapisz ID',
    save_full: 'Zapisz pełny snapshot',
    load_full: 'Wczytaj pełny snapshot',
    minimal_title: 'Minimalna synchronizacja (tylko obowiązki):',
    save_minimal: 'Zapisz minimalny (ostatnie wykonania)',
    load_replace: 'Wczytaj (zamień)',
    load_merge: 'Wczytaj (scal)',
    status: 'Status:',
    tip_tokens: 'Porada: utwórz token na github.com/settings/tokens z zakresem gist.',

    // Additional UI strings
    gist_sync_title: 'Synchronizacja Gist',
    gist_sync_desc: 'Przechowuj metadane synchronizacji w pliku GitHub Gist.',
    open_gist: 'Otwórz gist',

    // History / modals
    history_title: 'Historia',
    history_no_entries: 'Brak historii. Oznacz zadanie jako wykonane aby rozpocząć śledzenie!',
    history_list: 'Lista',
    history_calendar: 'Kalendarz',
    entries_on: 'Wpisy z',
    delete_entry_confirm: 'Usunąć ten wpis z historii?',
    delete_entry_failed: 'Nie udało się usunąć wpisu: ',
    delete_entry: 'Usuń wpis',

    // Trackable form
    field_name: 'Nazwa *',
    field_description: 'Opis',
    field_repeat: 'Powtarzaj co',
    unit_days: 'Dni',
    unit_weeks: 'Tygodnie',
    unit_months: 'Miesiące',
    unit_day_singular: 'Dzień',
    unit_week_singular: 'Tydzień',
    unit_month_singular: 'Miesiąc',
    every: 'Co',
    exercise_target_label: 'Docelowa ilość na okres',
    exercise_target_help: 'Brak tej ilości spowoduje narastanie zadłużenia',
    cancel: 'Anuluj',
    save: 'Zapisz',

    // Trackable card / list
    never: 'Nigdy',
    never_done: 'Nigdy nie wykonane',
    today: 'Dzisiaj',
    yesterday: 'Wczoraj',
    days_ago: 'dni temu',
    weeks_ago: 'tygodni temu',
    months_ago: 'miesięcy temu',
    times: 'razy',
    last_done: 'Ostatnio:',
    mark_done: 'Oznacz jako wykonane',
    complete: 'Complete',
    completeToday: 'Complete today',
    logExercise: 'Log exercise',
    updated: 'Updated',
    view_history: 'Pokaż historię',
    viewHistory: 'View history',
    edit: 'Edytuj',
    overdue: 'dni spóźnienia',

    // Log exercise modal
    log_title: 'Zaloguj',
    debt_to_pay: 'Do nadrobienia:',
    all_caught_up: '✓ Wszystko uregulowane! Możesz wykonać 1 dzień z wyprzedzeniem.',
    already_done: '🎉 Wykonałeś już jutro! Odpocznij.',
    amount_label: 'Ilość',
    notes_optional: 'Notatki (opcjonalnie)',
    log_button: 'Zaloguj',

    // Exercise card
    debt_label: 'Zaległe:',
    done_label: '✓ Wykonane',
    ahead_label: 'z wyprzedzeniem',
    todo_label: 'Do zrobienia',
    total_label: 'łącznie',
    debt_from_past: 'zaległe z poprzednich okresów',
    today_label: 'Dziś:',

    // Exercises / Groceries
    exercises_title: 'Ćwiczenia',
    add_exercise: 'Dodaj ćwiczenie',
    exercise_debt_title: 'Zaległe ćwiczeń do nadrobienia',
    exercise_debt_sub: 'Masz zaległe ćwiczenia — czas nadrobić!',
    exercises_empty: 'Brak ćwiczeń dla {name}.',

    groceries_title: 'Zakupy',
    grocery_empty_title: 'Twoja lista zakupów jest pusta.',
    grocery_empty_sub: 'Dodaj elementy powyżej, aby rozpocząć!',
    placeholder_add_item: 'Dodaj przedmiot...',
    placeholder_qty: 'Ilość',
    done_section: 'Gotowe',

    // People / users
    people_title: 'Użytkownicy',
    people_desc: 'Twórz, wybieraj i usuwaj użytkowników.',
    add_person: 'Dodaj osobę',
    add_person_button: 'Utwórz',
    emoji_label: 'Emoji',
    people_selected: 'Wybrany',
    delete_person_confirm: 'Usunąć tego użytkownika?',
    delete_disabled_last_person: 'Nie można usunąć ostatniego użytkownika.',
    people_showing_for: 'Wyświetlanie dla: {name}',
    select: 'Wybierz',

    // Calendar / misc
    chore_completions_month: 'Wykonania w tym miesiącu: {count}',
    no_entries_month: 'Brak wpisów w tym miesiącu.',
    events_this_item: 'Wydarzenia tego elementu: {count} • Rok: {year} • Miesiąc: {month}',
    delete: 'Usuń',
    language: 'Język',
    lang_en: 'Angielski',
    lang_pl: 'Polski',

    // Units
    unit_reps: 'Powtórzenia',
    unit_km: 'Kilometry',
    unit_steps: 'Kroki',
    unit_minutes: 'Minuty',
    unit_sets: 'Serie'
  }
}

export function t(key: string) {
  const d = dicts[locale.value] || dicts[DEFAULT]
  return d[key] ?? key
}

// A computed helper for template binding
export function useT() {
  return {
    locale: computed(() => locale.value),
    t: (k: string) => t(k)
  }
}

// Compare locales: report missing keys and empty translations
export function compareLocales() {
  const locales = Object.keys(dicts) as Locale[]
  const allKeys = new Set<string>()
  for (const l of locales) {
    Object.keys(dicts[l]).forEach(k => allKeys.add(k))
  }

  const report: {
    missing: Record<Locale, string[]>
    empty: Record<Locale, string[]>
  } = { missing: { en: [], pl: [] }, empty: { en: [], pl: [] } }

  for (const l of locales) {
    const defined = dicts[l]
    report.missing[l] = []
    report.empty[l] = []
    for (const key of allKeys) {
      if (!(key in defined)) report.missing[l].push(key)
      else if (defined[key] === '') report.empty[l].push(key)
    }
  }

  return report
}

export function logLocaleProblems() {
  const r = compareLocales()
  const summaries: string[] = []
  for (const l of Object.keys(r.missing) as Locale[]) {
    if (r.missing[l].length) summaries.push(`${l}: missing ${r.missing[l].length}`)
    if (r.empty[l].length) summaries.push(`${l}: empty ${r.empty[l].length}`)
  }
  if (summaries.length) {
    console.warn(`[i18n] Locale issues: ${summaries.join('; ')}. Run compareLocales() for details.`)
    console.debug('[i18n] Detailed report:', r)
  }
}
