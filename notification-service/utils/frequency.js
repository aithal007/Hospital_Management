const MS_PER_HOUR = 60 * 60 * 1000;

export function getReminderRepeatMs(frequency = '') {
  const normalized = frequency.toLowerCase();

  if (normalized.includes('twice') || normalized.includes('2 times')) {
    return 12 * MS_PER_HOUR;
  }
  if (normalized.includes('three') || normalized.includes('thrice') || normalized.includes('3 times')) {
    return 8 * MS_PER_HOUR;
  }
  if (normalized.includes('four') || normalized.includes('4 times')) {
    return 6 * MS_PER_HOUR;
  }

  return 24 * MS_PER_HOUR;
}
