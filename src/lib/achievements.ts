import { supabase } from './supabase';

export type AchievementType =
  | 'first_match'
  | 'first_trade'
  | 'ten_swipes'
  | 'fifty_swipes'
  | 'first_listing'
  | 'three_trades'
  | 'curator';

export const ACHIEVEMENT_META: Record<AchievementType, { icon: string; label: string; caption: string }> = {
  first_match: { icon: '🤝', label: 'First Match', caption: 'Mutual swipe. Chat unlocked.' },
  first_trade: { icon: '🎁', label: 'First Trade', caption: 'Sealed your first deal.' },
  ten_swipes: { icon: '⚡', label: 'Warming Up', caption: '10 items swiped.' },
  fifty_swipes: { icon: '🔥', label: 'On Fire', caption: '50 items swiped.' },
  first_listing: { icon: '📦', label: 'First Listing', caption: 'Put your first item up for trade.' },
  three_trades: { icon: '🌟', label: 'Trader', caption: 'Completed 3 trades.' },
  curator: { icon: '🎨', label: 'Curator', caption: 'Listed 5 items.' },
};

export async function grantAchievement(userId: string, type: AchievementType): Promise<boolean> {
  const { data: existing } = await supabase
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase.from('achievements').insert({ user_id: userId, type });
  return !error;
}
