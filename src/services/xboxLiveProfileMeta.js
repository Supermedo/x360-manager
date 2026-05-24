export const XBOX_COUNTRIES = [
  { value: 0, label: 'Unknown' },
  { value: 1, label: 'United States' },
  { value: 2, label: 'Canada' },
  { value: 3, label: 'United Kingdom' },
  { value: 4, label: 'Australia' },
  { value: 5, label: 'France' },
  { value: 6, label: 'Germany' },
  { value: 7, label: 'Japan' },
  { value: 8, label: 'Mexico' },
  { value: 9, label: 'Brazil' },
  { value: 10, label: 'Spain' },
  { value: 11, label: 'Italy' },
  { value: 12, label: 'Netherlands' },
  { value: 13, label: 'Sweden' },
  { value: 14, label: 'Poland' }
];

export const XBOX_LANGUAGES = [
  { value: 0, label: 'None / Default' },
  { value: 1, label: 'English' },
  { value: 2, label: 'Japanese' },
  { value: 3, label: 'German' },
  { value: 4, label: 'French' },
  { value: 5, label: 'Spanish' },
  { value: 6, label: 'Italian' },
  { value: 7, label: 'Korean' },
  { value: 8, label: 'Chinese (Traditional)' },
  { value: 9, label: 'Portuguese' }
];

export const SUBSCRIPTION_TIERS = [
  { value: 0, label: 'No Subscription' },
  { value: 1, label: 'Xbox Live Gold' },
  { value: 2, label: 'Xbox Game Pass' }
];

export const formatProfileLabel = (profile) => {
  const tag = profile?.gamertag || 'User';
  const id = profile?.liveXuid || profile?.profileKey || '';
  return id ? `${tag} (${id})` : tag;
};
