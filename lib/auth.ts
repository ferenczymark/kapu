import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * 1. Ki az aktuális felhasználó?
 * Megkérdezi a Supabase-t, hogy ki van bejelentkezve.
 * Visszaadja a User objektumot, vagy null-t, ha nincs bejelentkezve senki.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Hiba a felhasználó lekérésekor:', error);
    return null;
  }
}

/**
 * 2. Kijelentkezés
 * Kitörli a munkamenetet és a tokent a böngészőből.
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('Hiba a kijelentkezés során:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Ő egy admin?
 * Lekéri az aktuális felhasználót, majd megnézi a 'profiles' (vagy 'users') táblában,
 * hogy a 'role' mezője 'admin'-e.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    // Megnézzük a profiles táblában a felhasználó szerepkörét (role)
    const { data, error } = await supabase
      .from('profiles') // Ha az adatbázisodban a tábla neve 'users', írd át arra!
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'admin';
  } catch (error) {
    console.error('Hiba az admin státusz ellenőrzésekor:', error);
    return false;
  }
}