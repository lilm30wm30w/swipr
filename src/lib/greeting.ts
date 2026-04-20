export function greetingForHour(hour: number): { label: string; icon: string } {
  if (hour >= 5 && hour < 12) return { label: 'Good morning', icon: '☀️' };
  if (hour >= 12 && hour < 17) return { label: 'Good afternoon', icon: '🌤' };
  if (hour >= 17 && hour < 21) return { label: 'Good evening', icon: '🌆' };
  return { label: 'Night owl', icon: '🌙' };
}

export function currentGreeting() {
  return greetingForHour(new Date().getHours());
}
